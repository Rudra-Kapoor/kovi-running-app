import { Injectable } from '@nestjs/common';
import { DistanceCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SPLIT_COLUMN: Record<DistanceCategory, string> = {
  FIVE_K: 'split5kSeconds',
  TEN_K: 'split10kSeconds',
  HALF_MARATHON: 'split21kSeconds',
};

export interface GlobalLeaderboardQuery {
  category: DistanceCategory;
  city?: string;
  state?: string;
  country?: string;
  /** "all" counts every run (PRD open question resolved: standalone runs count); "events" only event runs. */
  scope?: 'all' | 'events';
  take?: number;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  club: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  seconds: number;
  runId: string;
  date: Date;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  private conditions(q: GlobalLeaderboardQuery) {
    const col = Prisma.raw(`"${SPLIT_COLUMN[q.category]}"`);
    const parts: Prisma.Sql[] = [Prisma.sql`r.${col} IS NOT NULL`];
    if (q.scope === 'events') parts.push(Prisma.sql`r."eventId" IS NOT NULL`);
    if (q.city) parts.push(Prisma.sql`lower(u.city) = lower(${q.city})`);
    if (q.state) parts.push(Prisma.sql`lower(u.state) = lower(${q.state})`);
    if (q.country) parts.push(Prisma.sql`lower(u.country) = lower(${q.country})`);
    return { col, where: Prisma.join(parts, ' AND ') };
  }

  /** Global leaderboard for a distance category: each runner's best time, fastest first. */
  async global(q: GlobalLeaderboardQuery, currentUserId?: string) {
    const { col, where } = this.conditions(q);
    const take = Math.min(Math.max(q.take ?? 50, 1), 200);

    // Best run per user (DISTINCT ON keeps the fastest row so we can link to it).
    const rows = await this.prisma.$queryRaw<Omit<LeaderboardRow, 'rank'>[]>`
      SELECT * FROM (
        SELECT DISTINCT ON (u.id)
          u.id AS "userId", u.name, u."photoUrl", u.club, u.city, u.state, u.country,
          r.${col} AS seconds, r.id AS "runId", r."startedAt" AS date
        FROM "Run" r JOIN "User" u ON u.id = r."userId"
        WHERE ${where}
        ORDER BY u.id, r.${col} ASC
      ) best
      ORDER BY seconds ASC, date ASC
      LIMIT ${take}`;

    const items: LeaderboardRow[] = rows.map((r, i) => ({ ...r, rank: i + 1 }));

    let me: LeaderboardRow | null = null;
    if (currentUserId) {
      me = items.find((r) => r.userId === currentUserId) ?? null;
      if (!me) {
        const mine = await this.prisma.$queryRaw<{ seconds: number; runId: string; date: Date }[]>`
          SELECT r.${col} AS seconds, r.id AS "runId", r."startedAt" AS date
          FROM "Run" r JOIN "User" u ON u.id = r."userId"
          WHERE ${where} AND u.id = ${currentUserId}
          ORDER BY r.${col} ASC LIMIT 1`;
        if (mine.length) {
          const [{ count }] = await this.prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) AS count FROM (
              SELECT u.id, MIN(r.${col}) AS s
              FROM "Run" r JOIN "User" u ON u.id = r."userId"
              WHERE ${where} GROUP BY u.id
            ) x WHERE x.s < ${mine[0].seconds}`;
          const user = await this.prisma.user.findUniqueOrThrow({ where: { id: currentUserId } });
          me = {
            rank: Number(count) + 1,
            userId: user.id,
            name: user.name,
            photoUrl: user.photoUrl,
            club: user.club,
            city: user.city,
            state: user.state,
            country: user.country,
            ...mine[0],
          };
        }
      }
    }

    return { category: q.category, items, me };
  }
}
