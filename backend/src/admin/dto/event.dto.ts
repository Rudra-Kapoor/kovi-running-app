import { ApiProperty, PartialType } from '@nestjs/swagger';
import { DistanceCategory } from '@prisma/client';
import { IsDateString, IsEnum, IsString, Length, MaxLength } from 'class-validator';

export class CreateEventDto {
  @ApiProperty() @IsString() @Length(1, 120) name: string;
  @ApiProperty() @IsString() @MaxLength(5000) description: string;
  @ApiProperty({ enum: DistanceCategory }) @IsEnum(DistanceCategory) distanceCategory: DistanceCategory;
  @ApiProperty({ description: 'ISO 8601 date-time' }) @IsDateString() date: string;
  @ApiProperty() @IsString() @Length(1, 200) location: string;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}
