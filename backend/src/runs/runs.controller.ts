import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateRunDto } from './dto/create-run.dto';
import { RunsService } from './runs.service';

@ApiTags('runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  @ApiOperation({ summary: 'Save a completed run (optionally linked to an event)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRunDto) {
    return this.runs.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My activity history (newest first)' })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  list(
    @CurrentUser() user: JwtUser,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.runs.listMine(user.sub, Math.min(take ?? 20, 100), cursor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One of my runs with its full route' })
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.runs.getMine(user.sub, id);
  }
}
