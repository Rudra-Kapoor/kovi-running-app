import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DistanceCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SPLIT_FIELD: Record<DistanceCategory, 'split5kSeconds' | 'split10kSeconds' | 'split21kSeconds'> = {
  FIVE_K: 'split5kSeconds',
  TEN_K: 'split10kSeconds',
  HALF_MARATHON: 'split21kSeconds',
};

export type EventFilter = 'upcoming' | 'past' | 'all';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string | null, filter: EventFilter = 'all') {
    const now = new Date();
    const where: Prisma.EventWhereInput = { deletedAt: null };
    if (filter === 'upcoming') where.date = { gte: now };
    if (filter === 'past') where.date = { lt: now };
    const events = await this.prisma.event.findMany({
      where,
      orderBy: { date: filter === 'past' ? 'desc' : 'asc' },
      include: { _count: { select: { participations: true } } },
    });
    const joined = userId
      ? await this.prisma.eventParticipation.findMany({
          where: { userId, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true, club: true },
        })
      : [];
    return events.map(({ _count, ...e }) => {
      const p = joined.find((j) => j.eventId === e.id);
      return { ...e, participantCount: _count.participations, joined: !!p, myClub: p?.club ?? null };
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async getForUser(id: string, userId: string) {
    const event = await this.findOne(id);
    const [participantCount, participation] = await Promise.all([
      this.prisma.eventParticipation.count({ where: { eventId: id } }),
      this.prisma.eventParticipation.findUnique({
        where: { userId_eventId: { userId, eventId: id } },
      }),
    ]);
    return { ...event, participantCount, joined: !!participation, myClub: participation?.club ?? null };
  }

  /**
   * Joins an event. Throws 409 when already joined unless `idempotent` (used by Event Run Mode,
   * where starting an event run implies participation).
   */
  async join(userId: string, eventId: string, club?: string, idempotent = true) {
    await this.findOne(eventId);
    const existing = await this.prisma.eventParticipation.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
      if (!idempotent) throw new ConflictException('You have already joined this event');
      return existing;
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.eventParticipation.create({
      data: { userId, eventId, club: club?.trim() || user.club || null },
    });
  }

  async participants(eventId: string) {
    await this.findOne(eventId);
    const parts = await this.prisma.eventParticipation.findMany({
      where: { eventId },
      orderBy: { joinedAt: 'asc' },
      include: { user: { select: { id: true, name: true, photoUrl: true, city: true, club: true } } },
    });
    return parts.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      photoUrl: p.user.photoUrl,
      city: p.user.city,
      club: p.club ?? p.user.club,
      joinedAt: p.joinedAt,
    }));
  }

  /** Event leaderboard: each runner's fastest time over the event distance, fastest first. */
  async leaderboard(eventId: string) {
    const event = await this.findOne(eventId);
    const field = SPLIT_FIELD[event.distanceCategory];
    const rows = await this.prisma.run.groupBy({
      by: ['userId'],
      where: { eventId, [field]: { not: null } },
      _min: { [field]: true },
      orderBy: { _min: { [field]: 'asc' } },
    });
    const userIds = rows.map((r) => r.userId);
    const [users, parts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, photoUrl: true, club: true, city: true },
      }),
      this.prisma.eventParticipation.findMany({
        where: { eventId, userId: { in: userIds } },
        select: { userId: true, club: true },
      }),
    ]);
    return rows.map((r, i) => {
      const u = users.find((x) => x.id === r.userId);
      const p = parts.find((x) => x.userId === r.userId);
      return {
        rank: i + 1,
        userId: r.userId,
        name: u?.name ?? 'Runner',
        photoUrl: u?.photoUrl ?? null,
        club: p?.club ?? u?.club ?? null,
        city: u?.city ?? null,
        completionSeconds: (r._min as Record<string, number | null>)[field] as number,
      };
    });
  }

  async rankOf(eventId: string, userId: string) {
    const board = await this.leaderboard(eventId);
    const row = board.find((r) => r.userId === userId);
    return row ? { rank: row.rank, of: board.length, completionSeconds: row.completionSeconds } : null;
  }
}
