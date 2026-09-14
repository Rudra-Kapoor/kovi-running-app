import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';

/** Serves files stored in the database (STORAGE_DRIVER=db). The local driver uses static assets. */
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':id')
  async get(@Param('id') id: string, @Res() res: Response) {
    const file = await this.storage.getDbFile(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.send(Buffer.from(file.data));
  }
}
