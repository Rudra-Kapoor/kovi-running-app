import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid user JWT (role = user). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, _info: any, _ctx: ExecutionContext): TUser {
    if (err || !user) throw err ?? new UnauthorizedException('Sign in required');
    if (user.role !== 'user') throw new UnauthorizedException('User token required');
    return user;
  }
}
