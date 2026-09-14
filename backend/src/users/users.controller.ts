import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { imageUploadOptions } from '../common/utils/image-upload';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'My profile' })
  me(@CurrentUser() user: JwtUser) {
    return this.users.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile / complete onboarding' })
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, dto);
  }

  @Post('photo')
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  photo(@CurrentUser() user: JwtUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.users.updatePhoto(user.sub, file);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Personal bests and totals' })
  stats(@CurrentUser() user: JwtUser) {
    return this.users.getStats(user.sub);
  }

  @Get('events')
  @ApiOperation({ summary: 'Events I have joined' })
  events(@CurrentUser() user: JwtUser) {
    return this.users.getEvents(user.sub);
  }
}
