import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoutePoint, summariseRoute } from '../common/utils/geo';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRunDto } from './dto/create-run.dto';

const runInclude = {
  event: {
    select: {
      id: true,
      name: true,
      distanceCategory: true,
      date: true,
      location: true,
      sponsorLogoUrl: true,
      bannerUrl: true,
    },
  },
} satisfies Prisma.RunInclude;

@Injectable()
export class RunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  /**
   * Saves a completed run. Distance, moving time and 5K/10K/21K splits are recomputed
   * server-side from the GPS route so leaderboards cannot be spoofed by client totals.
   */
  async create(userId: string, dto: CreateRunDto) {
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    if (isNaN(startedAt.getTime()) || isNaN(endedAt.getTime()) || endedAt <= startedAt) {
      throw new BadRequestException('endedAt must be after startedAt');
    }

    const route: RoutePoint[] = dto.route.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      t: p.t,
      alt: p.alt,
      seg: p.seg || undefined,
    }));
    const summary = summariseRoute(route);
    // A run with a broken/absent GPS trace still saves (using the client's numbers) but earns no splits.
    const hasTrace = route.length >= 2 && summary.distanceMeters > 0;
    const distanceMeters = hasTrace ? summary.distanceMeters : (dto.distanceMeters ?? 0);
    const durationSeconds = hasTrace
      ? summary.movingSeconds
      : (dto.durationSeconds ?? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
    const avgPaceSecPerKm = distanceMeters > 0 ? durationSeconds / (distanceMeters / 1000) : null;

    let eventId: string | null = null;
    if (dto.eventId) {
      const event = await this.events.findOne(dto.eventId);
      // "Start Event" implies participation; joining is idempotent.
      await this.events.join(userId, event.id, dto.club);
      eventId = event.id;
    }

    const run = await this.prisma.run.create({
      data: {
        userId,
        eventId,
        startedAt,
        endedAt,
        durationSeconds,
        distanceMeters,
        avgPaceSecPerKm,
        route: route as unknown as Prisma.InputJsonValue,
        split5kSeconds: hasTrace ? summary.splits.FIVE_K : null,
        split10kSeconds: hasTrace ? summary.splits.TEN_K : null,
        split21kSeconds: hasTrace ? summary.splits.HALF_MARATHON : null,
      },
      include: runInclude,
    });

    const eventRank = eventId ? await this.events.rankOf(eventId, userId) : null;
    return { ...run, eventRank };
  }

  async listMine(userId: string, take = 20, cursor?: string) {
    const runs = await this.prisma.run.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        distanceMeters: true,
        avgPaceSecPerKm: true,
        eventId: true,
        split5kSeconds: true,
        split10kSeconds: true,
        split21kSeconds: true,
        event: { select: { id: true, name: true, distanceCategory: true } },
      },
    });
    const hasMore = runs.length > take;
    const items = hasMore ? runs.slice(0, take) : runs;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async getMine(userId: string, id: string) {
    const run = await this.prisma.run.findFirst({ where: { id, userId }, include: runInclude });
    if (!run) throw new NotFoundException('Run not found');
    const eventRank = run.eventId ? await this.events.rankOf(run.eventId, userId) : null;
    return { ...run, eventRank };
  }
}
