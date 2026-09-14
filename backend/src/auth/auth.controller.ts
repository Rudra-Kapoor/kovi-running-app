import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  AppleAuthDto,
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Email sign-up' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email login' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Google Sign-In (exchange a Google ID token for a Kovi token)' })
  google(@Body() dto: GoogleAuthDto) {
    return this.auth.google(dto.idToken);
  }

  @Post('apple')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apple Sign-In (exchange an Apple identity token for a Kovi token)' })
  apple(@Body() dto: AppleAuthDto) {
    return this.auth.apple(dto.identityToken, dto.fullName);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email a 6-digit password reset code' })
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using the emailed code' })
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a fresh token for the signed-in user' })
  refresh(@CurrentUser() user: JwtUser) {
    return this.auth.refresh(user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: JwtUser) {
    return this.users.getProfile(user.sub);
  }
}
