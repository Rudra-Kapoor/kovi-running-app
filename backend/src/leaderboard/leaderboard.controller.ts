import { Controller, Get, ParseEnumPipe, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DistanceCategory } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Global leaderboard (5K / 10K / 21K), filterable by city, state, country' })
  @ApiQuery({ name: 'category', enum: DistanceCategory })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'scope', enum: ['all', 'events'], required: false })
  @ApiQuery({ name: 'take', required: false })
  global(
    @CurrentUser() user: JwtUser,
    @Query('category', new ParseEnumPipe(DistanceCategory)) category: DistanceCategory,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('country') country?: string,
    @Query('scope') scope?: 'all' | 'events',
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.leaderboard.global(
      { category, city, state, country, scope: scope === 'events' ? 'events' : 'all', take },
      user.sub,
    );
  }
}
