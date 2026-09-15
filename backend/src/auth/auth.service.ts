import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/users.service';

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client();
  private readonly googleClientIds: string[];
  private readonly appleBundleId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.googleClientIds = (config.get<string>('GOOGLE_CLIENT_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.appleBundleId = config.get<string>('APPLE_BUNDLE_ID') ?? 'com.kovi.running';
  }

  // ---------- Email / password ----------

  async register(email: string, password: string, name: string) {
    email = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');
    const user = await this.prisma.user.create({
      data: { email, name: name.trim(), passwordHash: await bcrypt.hash(password, 10) },
    });
    return this.issue(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    return this.issue(user);
  }

  // ---------- Social sign-in ----------

  async google(idToken: string) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientIds.length ? this.googleClientIds : undefined,
      });
      payload = ticket.getPayload();
    } catch (e) {
      this.logger.warn(`Google token rejected: ${(e as Error).message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
    if (!payload?.sub || !payload.email) throw new UnauthorizedException('Google token missing email');
    const user = await this.findOrCreateSocial(
      AuthProvider.GOOGLE,
      payload.sub,
      payload.email,
      payload.name ?? payload.email.split('@')[0],
      payload.picture,
    );
    return this.issue(user);
  }

  async apple(identityToken: string, fullName?: string) {
    let claims;
    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: this.appleBundleId,
      });
      claims = payload;
    } catch (e) {
      this.logger.warn(`Apple token rejected: ${(e as Error).message}`);
      throw new UnauthorizedException('Invalid Apple token');
    }
    const email = typeof claims.email === 'string' ? claims.email : undefined;
    if (!claims.sub || !email) throw new UnauthorizedException('Apple token missing email');
    const user = await this.findOrCreateSocial(
      AuthProvider.APPLE,
      claims.sub,
      email,
      fullName?.trim() || email.split('@')[0],
    );
    return this.issue(user);
  }

  private async findOrCreateSocial(
    provider: AuthProvider,
    providerId: string,
    email: string,
    name: string,
    photoUrl?: string,
  ) {
    email = email.toLowerCase();
    const byProvider = await this.prisma.user.findFirst({ where: { provider, providerId } });
    if (byProvider) return byProvider;
    // Same email registered another way: link the social identity to that account.
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return this.prisma.user.update({ where: { id: byEmail.id }, data: { provider, providerId } });
    }
    return this.prisma.user.create({ data: { provider, providerId, email, name, photoUrl } });
  }

  // ---------- Password reset ----------

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Always respond OK so the endpoint cannot be used to enumerate accounts.
    if (!user || !user.passwordHash) return { ok: true };
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash(code, 8),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await this.mail.sendPasswordResetCode(user.email, code);
    return { ok: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) throw new BadRequestException('Invalid or expired code');
    const resets = await this.prisma.passwordReset.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    let match = null;
    for (const r of resets) if (await bcrypt.compare(code, r.codeHash)) match = r;
    if (!match) throw new BadRequestException('Invalid or expired code');
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({ where: { id: match.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 10) },
      }),
    ]);
    return this.issue(user);
  }

  // ---------- Tokens ----------

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.issue(user);
  }

  private issue(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: 'user' });
    return { accessToken, user: toPublicUser(user) };
  }
}
