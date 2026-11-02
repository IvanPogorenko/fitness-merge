// Снимает реальные примеры запросов и ответов API на малом seed (этап 6).
// Запуск при работающем приложении: npm run seed:small && npm run start, затем npm run docs:api
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:3000';
const out: string[] = [
  '# Примеры запросов и ответов API',
  '',
  `Сняты скриптом \`be/scripts/api-examples.ts\` на малом seed (\`npm run seed:small\`), ${new Date().toISOString()}.`,
  'Пользователь выбирается заголовком `X-Demo-User-Id` (учебный demo-режим, см. README).',
  '',
];

async function call(title: string, method: string, path: string, options: { user?: string; body?: unknown } = {}): Promise<any> {
  const headers: Record<string, string> = {};
  if (options.user) headers['x-demo-user-id'] = options.user;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  out.push(`## ${title}`, '', '```http', `${method} ${path}`);
  if (options.user) out.push(`X-Demo-User-Id: ${options.user}`);
  if (options.body !== undefined) out.push('Content-Type: application/json', '', JSON.stringify(options.body, null, 2));
  out.push('```', '', `Ответ: **${res.status}**`, '');
  if (json !== undefined) out.push('```json', JSON.stringify(json, null, 2), '```', '');
  return json;
}

async function main(): Promise<void> {
  const page = await call('GET /videos — первая страница каталога', 'GET', '/videos?limit=3');
  await call('GET /videos — следующая страница по курсору', 'GET', `/videos?limit=3&cursor=${page.nextCursor}`);
  await call('GET /videos — поиск по части названия и фильтр по каналу', 'GET', '/videos?q=video&channelId=4&limit=5');
  const created = await call('POST /videos — создание черновика с тегами', 'POST', '/videos', {
    user: '1',
    body: { channelId: '1', title: 'Утренняя зарядка', description: 'Комплекс на 15 минут', sizeBytes: '15000000', tagIds: ['1', '9'] },
  });
  await call('POST /videos — недостаточно квоты', 'POST', '/videos', { user: '1', body: { channelId: '1', title: 'Огромное видео', sizeBytes: '104857600' } });
  await call('POST /videos — неизвестный тег', 'POST', '/videos', { user: '1', body: { channelId: '1', title: 'x', sizeBytes: '10', tagIds: ['999'] } });
  await call('POST /videos — лишнее поле и пустое название', 'POST', '/videos', { user: '1', body: { channelId: '1', title: ' ', sizeBytes: '10', status: 'published' } });
  await call('POST /videos — чужой канал', 'POST', '/videos', { user: '2', body: { channelId: '1', title: 'x', sizeBytes: '10' } });
  await call('GET /videos/:id — черновик видит владелец', 'GET', `/videos/${created.id}`, { user: '1' });
  await call('GET /videos/:id — черновик недоступен другим', 'GET', `/videos/${created.id}`, { user: '2' });
  await call('PATCH /videos/:id — изменение названия и описания', 'PATCH', `/videos/${created.id}`, { user: '1', body: { title: 'Утренняя зарядка (v2)', description: null } });
  await call('PATCH /videos/:id — изменить размер нельзя', 'PATCH', `/videos/${created.id}`, { user: '1', body: { sizeBytes: '1' } });
  await call('PATCH /videos/:id — чужое видео', 'PATCH', `/videos/${created.id}`, { user: '2', body: { title: 'x' } });
  await call('PATCH /videos/:id/status — публикация', 'PATCH', `/videos/${created.id}/status`, { user: '1', body: { status: 'published' } });
  await call('PATCH /videos/:id/status — повтор текущего статуса', 'PATCH', `/videos/${created.id}/status`, { user: '1', body: { status: 'published' } });
  await call('PUT /me/favorites/:videoId — добавление', 'PUT', `/me/favorites/${created.id}`, { user: '4' });
  await call('PUT /me/favorites/:videoId — повтор', 'PUT', `/me/favorites/${created.id}`, { user: '4' });
  await call('PUT /me/favorites/:videoId — черновик недоступен', 'PUT', '/me/favorites/1', { user: '4' });
  await call('GET /me/favorites — список', 'GET', '/me/favorites', { user: '4' });
  await call('DELETE /me/favorites/:videoId — удаление', 'DELETE', `/me/favorites/${created.id}`, { user: '4' });
  await call('DELETE /me/favorites/:videoId — повторное удаление', 'DELETE', `/me/favorites/${created.id}`, { user: '4' });
  await call('PATCH /videos/:id/status — скрытие', 'PATCH', `/videos/${created.id}/status`, { user: '1', body: { status: 'hidden' } });
  await call('GET /videos/:id — скрытое видео недоступно', 'GET', `/videos/${created.id}`);

  writeFileSync(resolve(process.cwd(), '../docs/api-examples.md'), out.join('\n'));
  console.log(`Written ${out.length} lines to docs/api-examples.md`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
