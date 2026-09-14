import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Strips secrets from a User row. */
export function toPublicUser(user: User) {
  const { passwordHash: _p, providerId: _i, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Partial<User> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.city !== undefined) data.city = dto.city?.trim() || null;
    if (dto.state !== undefined) data.state = dto.state?.trim() || null;
    if (dto.country !== undefined) data.country = dto.country?.trim() || null;
    if (dto.club !== undefined) data.club = dto.club?.trim() || null;
    if (dto.onboardingCompleted !== undefined) data.onboardingCompleted = dto.onboardingCompleted;
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return toPublicUser(user);
  }

  async updatePhoto(userId: string, file: Express.Multer.File) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const photoUrl = await this.storage.saveImage(file.buffer, 'avatar');
    const user = await this.prisma.user.update({ where: { id: userId }, data: { photoUrl } });
    await this.storage.deleteByUrl(current.photoUrl);
    return toPublicUser(user);
  }

  /** Personal bests: fastest 5K / 10K / 21K splits plus longest run and total distance. */
  async getStats(userId: string) {
    const [agg, best5, best10, best21, longest] = await Promise.all([
      this.prisma.run.aggregate({
        where: { userId },
        _count: { _all: true },
        _sum: { distanceMeters: true, durationSeconds: true },
      }),
      this.prisma.run.findFirst({
        where: { userId, split5kSeconds: { not: null } },
        orderBy: { split5kSeconds: 'asc' },
        select: { id: true, split5kSeconds: true, startedAt: true },
      }),
      this.prisma.run.findFirst({
        where: { userId, split10kSeconds: { not: null } },
        orderBy: { split10kSeconds: 'asc' },
        select: { id: true, split10kSeconds: true, startedAt: true },
      }),
      this.prisma.run.findFirst({
        where: { userId, split21kSeconds: { not: null } },
        orderBy: { split21kSeconds: 'asc' },
        select: { id: true, split21kSeconds: true, startedAt: true },
      }),
      this.prisma.run.findFirst({
        where: { userId },
        orderBy: { distanceMeters: 'desc' },
        select: { id: true, distanceMeters: true, startedAt: true },
      }),
    ]);
    return {
      totalRuns: agg._count._all,
      totalDistanceMeters: agg._sum.distanceMeters ?? 0,
      totalDurationSeconds: agg._sum.durationSeconds ?? 0,
      personalBests: {
        FIVE_K: best5 ? { runId: best5.id, seconds: best5.split5kSeconds, date: best5.startedAt } : null,
        TEN_K: best10
          ? { runId: best10.id, seconds: best10.split10kSeconds, date: best10.startedAt }
          : null,
        HALF_MARATHON: best21
          ? { runId: best21.id, seconds: best21.split21kSeconds, date: best21.startedAt }
          : null,
        longestRun: longest
          ? { runId: longest.id, distanceMeters: longest.distanceMeters, date: longest.startedAt }
          : null,
      },
    };
  }

  /** Events the user has joined, newest first, with their best time on each. */
  async getEvents(userId: string) {
    const parts = await this.prisma.eventParticipation.findMany({
      where: { userId, event: { deletedAt: null } },
      include: { event: true },
      orderBy: { event: { date: 'desc' } },
    });
    const eventIds = parts.map((p) => p.eventId);
    const runs = eventIds.length
      ? await this.prisma.run.findMany({
          where: { userId, eventId: { in: eventIds } },
          orderBy: { durationSeconds: 'asc' },
          select: { id: true, eventId: true, durationSeconds: true, distanceMeters: true },
        })
      : [];
    return parts.map((p) => ({
      ...p.event,
      club: p.club,
      joinedAt: p.joinedAt,
      bestRun: runs.find((r) => r.eventId === p.eventId) ?? null,
    }));
  }
}
