import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    private readonly config: ConfigService,
  ) {}

  /** Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists yet. */
  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    try {
      const count = await this.prisma.adminUser.count();
      if (count > 0) return;
      await this.prisma.adminUser.create({
        data: { email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), name: 'Admin' },
      });
      this.logger.log(`Seeded initial admin account ${email}`);
    } catch (e) {
      this.logger.warn(`Could not seed admin (is the database migrated?): ${(e as Error).message}`);
    }
  }

  // ---------- Auth ----------

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    const accessToken = this.jwt.sign(
      { sub: admin.id, email: admin.email, role: 'admin' },
      { expiresIn: '12h' },
    );
    return { accessToken, admin: { id: admin.id, email: admin.email, name: admin.name } };
  }

  async me(adminId: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    return { id: admin.id, email: admin.email, name: admin.name };
  }

  // ---------- Dashboard ----------

  async stats() {
    const [users, events, upcomingEvents, runs, participations, recentUsers, recentRuns] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.event.count({ where: { deletedAt: null } }),
        this.prisma.event.count({ where: { deletedAt: null, date: { gte: new Date() } } }),
        this.prisma.run.count(),
        this.prisma.eventParticipation.count(),
        this.prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, name: true, email: true, city: true, createdAt: true, photoUrl: true },
        }),
        this.prisma.run.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            distanceMeters: true,
            durationSeconds: true,
            startedAt: true,
            user: { select: { id: true, name: true } },
            event: { select: { id: true, name: true } },
          },
        }),
      ]);
    return { users, events, upcomingEvents, runs, participations, recentUsers, recentRuns };
  }

  // ---------- Events ----------

  async listEvents() {
    const events = await this.prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
      include: { _count: { select: { participations: true, runs: true } } },
    });
    return events.map(({ _count, ...e }) => ({
      ...e,
      participantCount: _count.participations,
      runCount: _count.runs,
    }));
  }

  async getEvent(id: string) {
    const event = await this.events.findOne(id);
    const [participantCount, runCount] = await Promise.all([
      this.prisma.eventParticipation.count({ where: { eventId: id } }),
      this.prisma.run.count({ where: { eventId: id } }),
    ]);
    return { ...event, participantCount, runCount };
  }

  createEvent(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        distanceCategory: dto.distanceCategory,
        date: new Date(dto.date),
        location: dto.location.trim(),
      },
    });
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    await this.events.findOne(id);
    const data: Prisma.EventUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.distanceCategory !== undefined) data.distanceCategory = dto.distanceCategory;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.location !== undefined) data.location = dto.location.trim();
    return this.prisma.event.update({ where: { id }, data });
  }

  async deleteEvent(id: string) {
    await this.events.findOne(id);
    await this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async setBanner(id: string, file: Express.Multer.File) {
    const event = await this.events.findOne(id);
    const bannerUrl = await this.storage.saveImage(file.buffer, 'banner');
    const updated = await this.prisma.event.update({ where: { id }, data: { bannerUrl } });
    await this.storage.deleteByUrl(event.bannerUrl);
    return updated;
  }

  async setSponsorLogo(id: string, file: Express.Multer.File) {
    const event = await this.events.findOne(id);
    const sponsorLogoUrl = await this.storage.saveImage(file.buffer, 'logo');
    const updated = await this.prisma.event.update({ where: { id }, data: { sponsorLogoUrl } });
    await this.storage.deleteByUrl(event.sponsorLogoUrl);
    return updated;
  }

  async removeSponsorLogo(id: string) {
    const event = await this.events.findOne(id);
    const updated = await this.prisma.event.update({ where: { id }, data: { sponsorLogoUrl: null } });
    await this.storage.deleteByUrl(event.sponsorLogoUrl);
    return updated;
  }

  // ---------- Users ----------

  async listUsers(search?: string, take = 50) {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { club: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        city: true,
        state: true,
        country: true,
        club: true,
        provider: true,
        createdAt: true,
        _count: { select: { runs: true, participations: true } },
      },
    });
    return users.map(({ _count, ...u }) => ({ ...u, runCount: _count.runs, eventCount: _count.participations }));
  }
}
