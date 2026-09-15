import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinEventDto {
  @ApiPropertyOptional({ description: 'Running club to tag on this event leaderboard' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  club?: string;
}
