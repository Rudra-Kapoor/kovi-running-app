import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { imageUploadOptions } from '../common/utils/image-upload';
import { EventsService } from '../events/events.service';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

const fileBody = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly events: EventsService,
  ) {}

  // ---------- Auth ----------

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login (internal team only)' })
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto.email, dto.password);
  }

  @Get('auth/me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() admin: JwtUser) {
    return this.admin.me(admin.sub);
  }

  // ---------- Dashboard ----------

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  stats() {
    return this.admin.stats();
  }

  // ---------- Events ----------

  @Get('events')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  listEvents() {
    return this.admin.listEvents();
  }

  @Post('events')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  createEvent(@Body() dto: CreateEventDto) {
    return this.admin.createEvent(dto);
  }

  @Get('events/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  getEvent(@Param('id') id: string) {
    return this.admin.getEvent(id);
  }

  @Patch('events/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.admin.updateEvent(id, dto);
  }

  @Delete('events/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  deleteEvent(@Param('id') id: string) {
    return this.admin.deleteEvent(id);
  }

  @Post('events/:id/banner')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  banner(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.admin.setBanner(id, file);
  }

  @Post('events/:id/sponsor-logo')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  sponsorLogo(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.admin.setSponsorLogo(id, file);
  }

  @Delete('events/:id/sponsor-logo')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  removeSponsorLogo(@Param('id') id: string) {
    return this.admin.removeSponsorLogo(id);
  }

  @Get('events/:id/participants')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  participants(@Param('id') id: string) {
    return this.events.participants(id);
  }

  @Get('events/:id/leaderboard')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  leaderboard(@Param('id') id: string) {
    return this.events.leaderboard(id);
  }

  // ---------- Users ----------

  @Get('users')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  users(
    @Query('search') search?: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.admin.listUsers(search?.trim() || undefined, Math.min(take ?? 50, 200));
  }
}
