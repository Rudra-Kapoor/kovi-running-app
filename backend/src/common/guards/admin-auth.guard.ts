import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid admin JWT (role = admin). */
@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, _info: any, _ctx: ExecutionContext): TUser {
    if (err || !user) throw err ?? new UnauthorizedException('Admin sign in required');
    if (user.role !== 'admin') throw new UnauthorizedException('Admin token required');
    return user;
  }
}
