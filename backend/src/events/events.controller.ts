import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JoinEventDto } from './dto/join-event.dto';
import { EventFilter, EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Browse events' })
  @ApiQuery({ name: 'filter', enum: ['upcoming', 'past', 'all'], required: false })
  list(@CurrentUser() user: JwtUser, @Query('filter') filter?: EventFilter) {
    return this.events.list(user.sub, filter ?? 'all');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Event details' })
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.events.getForUser(id, user.sub);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an event (409 if already joined)' })
  join(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: JoinEventDto) {
    return this.events.join(user.sub, id, dto.club, false);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Who has joined' })
  participants(@Param('id') id: string) {
    return this.events.participants(id);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Event leaderboard - fastest completion first' })
  leaderboard(@Param('id') id: string) {
    return this.events.leaderboard(id);
  }
}
