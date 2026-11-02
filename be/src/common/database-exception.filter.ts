import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { PG, pgErrorInfo } from './pg-error.js';

// Ограничения, нарушение которых означает ошибку клиента, а не сервера
const CLIENT_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  fk_video_tags_tag: { status: HttpStatus.BAD_REQUEST, message: 'Unknown tag id' },
  fk_videos_channel: { status: HttpStatus.BAD_REQUEST, message: 'Unknown channel id' },
  chk_channels_used_bytes_within_quota: { status: HttpStatus.CONFLICT, message: 'Channel quota exceeded' },
};

// Последний рубеж для ошибок PostgreSQL, не обработанных в сервисах.
// Неизвестные ошибки дают общий 500, подробности — только во внутреннем логе.
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(error: QueryFailedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const info = pgErrorInfo(error);
    const known = info?.constraint ? CLIENT_ERRORS[info.constraint] : undefined;

    if (known) {
      response.status(known.status).json({ statusCode: known.status, message: known.message });
      return;
    }
    if (info?.code === PG.LOCK_NOT_AVAILABLE || info?.code === PG.QUERY_CANCELED) {
      this.logger.warn(`Database timeout ${info.code}: ${error.message}`);
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'Database is busy, retry later' });
      return;
    }

    this.logger.error(`Unhandled database error code=${info?.code} constraint=${info?.constraint}: ${error.message}`, error.stack);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' });
  }
}
