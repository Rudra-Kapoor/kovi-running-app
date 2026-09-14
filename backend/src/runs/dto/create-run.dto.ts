import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RoutePointDto {
  @ApiProperty() @IsLatitude() lat: number;
  @ApiProperty() @IsLongitude() lng: number;
  @ApiProperty({ description: 'Unix epoch milliseconds' }) @IsInt() @Min(0) t: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() alt?: number;
  @ApiPropertyOptional({ description: 'True for the first point after a pause' })
  @IsOptional()
  @IsBoolean()
  seg?: boolean;
}

export class CreateRunDto {
  @ApiProperty() @IsDateString() startedAt: string;
  @ApiProperty() @IsDateString() endedAt: string;
  @ApiProperty({ type: [RoutePointDto] })
  @IsArray()
  @ArrayMaxSize(50000)
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  route: RoutePointDto[];
  @ApiPropertyOptional({ description: 'Link this run to an event (Event Run Mode)' })
  @IsOptional()
  @IsUUID()
  eventId?: string;
  @ApiPropertyOptional({ description: 'Club to show on the event leaderboard' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  club?: string;
  @ApiPropertyOptional({ description: 'Client-computed fallback, used only if the route is unusable' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceMeters?: number;
  @ApiPropertyOptional({ description: 'Client-computed fallback, used only if the route is unusable' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}
