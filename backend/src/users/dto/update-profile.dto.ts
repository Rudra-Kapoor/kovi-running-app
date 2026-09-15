import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 80) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) country?: string;
  @ApiPropertyOptional({ description: 'Running club (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  club?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() onboardingCompleted?: boolean;
}
