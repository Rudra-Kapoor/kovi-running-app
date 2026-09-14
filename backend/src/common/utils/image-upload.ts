import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/;

/** Multer options for image uploads: memory storage, 8 MB limit, images only. */
export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (e: Error | null, ok: boolean) => void,
  ) => {
    if (!IMAGE_MIME.test(file.mimetype)) {
      return cb(new BadRequestException('Only JPEG, PNG, WEBP or GIF images are allowed'), false);
    }
    cb(null, true);
  },
};
