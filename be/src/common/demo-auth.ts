import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { isPositiveBigintString } from './bigint.js';

// Учебный demo-режим вместо настоящей аутентификации: пользователь выбирается заголовком
// X-Demo-User-Id среди заранее созданных в seed. Сам заголовок не является аутентификацией —
// поэтому режим включается только явно (DEMO_AUTH=true) и запрещен при NODE_ENV=production.
export const DEMO_USER_HEADER = 'x-demo-user-id';

export interface RequestUser {
  id: string;
}

export function assertDemoAuthAllowed(env: Record<string, string | undefined> = process.env): void {
  if (env.DEMO_AUTH === 'true' && env.NODE_ENV === 'production') {
    throw new Error('DEMO_AUTH=true is forbidden when NODE_ENV=production');
  }
}

@Injectable()
abstract class DemoUserGuard implements CanActivate {
  protected abstract readonly required: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: RequestUser }>();
    const header = request.headers[DEMO_USER_HEADER];

    if (header === undefined) {
      if (this.required) throw new UnauthorizedException('User is not identified');
      return true;
    }
    if (this.config.get<string>('DEMO_AUTH') !== 'true') {
      throw new UnauthorizedException('Demo user selection is disabled');
    }
    if (!isPositiveBigintString(header)) {
      throw new UnauthorizedException(`${DEMO_USER_HEADER} must be a user id`);
    }
    const rows: unknown[] = await this.dataSource.query('SELECT 1 FROM users WHERE id = $1', [header]);
    if (rows.length === 0) {
      throw new UnauthorizedException('Unknown demo user');
    }
    request.user = { id: header };
    return true;
  }
}

@Injectable()
export class RequireUserGuard extends DemoUserGuard {
  protected readonly required = true;
}

// Для чтения карточки: аноним допустим, но владелец видит свои draft/hidden
@Injectable()
export class OptionalUserGuard extends DemoUserGuard {
  protected readonly required = false;
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): RequestUser | undefined => {
  return context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
});
