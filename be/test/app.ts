import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DEMO_USER_HEADER } from '../src/common/demo-auth.js';
import { SqlStatsLogger } from '../src/database/sql-stats.logger.js';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
  sqlStats: SqlStatsLogger;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

// Полное приложение Nest с настоящим DataSource на тестовой базе
export async function createTestApp(configure?: (builder: ReturnType<typeof Test.createTestingModule>) => void): Promise<TestApp> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  configure?.(builder);
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: ['error', 'warn'] }));
  await app.init();
  return {
    app,
    dataSource: app.get(DataSource),
    sqlStats: app.get(SqlStatsLogger),
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
  };
}

export function asUser(userId: string | number): Record<string, string> {
  return { [DEMO_USER_HEADER]: String(userId) };
}

export async function scalar<T = string>(dataSource: DataSource, sql: string, params: unknown[] = []): Promise<T> {
  const rows: Array<Record<string, T>> = await dataSource.query(sql, params);
  return Object.values(rows[0])[0];
}

export interface ChannelState {
  used: string;
  videos: string;
  links: string;
}

// Состояние связанных таблиц для сравнения «до» и «после» сценария
export async function channelState(dataSource: DataSource, channelId: string | number): Promise<ChannelState> {
  const [row] = await dataSource.query(
    `SELECT c.used_bytes::text AS used,
            (SELECT COUNT(*) FROM videos v WHERE v.channel_id = c.id)::text AS videos,
            (SELECT COUNT(*) FROM video_tags vt JOIN videos v ON v.id = vt.video_id WHERE v.channel_id = c.id)::text AS links
       FROM channels c WHERE c.id = $1`,
    [channelId],
  );
  return row;
}

export async function createChannel(dataSource: DataSource, ownerId: number, quotaBytes: string, title = 'Test channel'): Promise<string> {
  const [row] = await dataSource.query(`INSERT INTO channels (owner_id, title, quota_bytes) VALUES ($1, $2, $3) RETURNING id::text AS id`, [
    ownerId,
    title,
    quotaBytes,
  ]);
  return row.id;
}
