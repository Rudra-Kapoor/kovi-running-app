import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Normalises every error into { statusCode, message, error }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object') {
        const b = body as { message?: string | string[]; error?: string };
        message = b.message ?? exception.message;
        error = b.error ?? exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with these details already exists';
        error = 'Conflict';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        error = 'Not Found';
      }
    }

    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : exception);
    res.status(status).json({ statusCode: status, message, error });
  }
}
