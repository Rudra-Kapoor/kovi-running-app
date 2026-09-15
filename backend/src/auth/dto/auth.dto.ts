import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) password: string;
  @ApiProperty() @IsString() @Length(1, 80) name: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(1) password: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from the native sign-in flow' })
  @IsString()
  idToken: string;
}

export class AppleAuthDto {
  @ApiProperty({ description: 'Apple identity token (JWT) from Sign in with Apple' })
  @IsString()
  identityToken: string;
  @ApiPropertyOptional({ description: 'Full name - Apple only sends it on first sign-in' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fullName?: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ description: '6-digit code from the email' }) @IsString() @Length(6, 6) code: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) newPassword: string;
}
