Смерженный проект fitness

# Видеохостинг: backend на NestJS + PostgreSQL (ЛР3)

Backend `be/` хранит каталог видео, каналы, теги и избранное в PostgreSQL 17. Схема создается миграциями TypeORM, учебные данные — воспроизводимыми seed-скриптами. Создание видео атомарно расходует квоту канала и выдерживает конкурентные запросы.

Отчет: [docs/report.md](docs/report.md). Требования: [docs/requirements.md](docs/requirements.md). Модель, словарь и нормализация: [docs/model.md](docs/model.md). Результаты SQL: [docs/sql-results.md](docs/sql-results.md). Примеры API: [docs/api-examples.md](docs/api-examples.md). Планы выполнения: [docs/performance.md](docs/performance.md).

## Версии

| Компонент | Версия |
|---|---|
| PostgreSQL | 17.6 (сервер для проверок), образ `postgres:17-alpine` в compose |
| Node.js | 20.19.6 (нужен ≥ 20.19: NestJS 12 поставляется как ESM и подключается через `require(esm)`) |
| NestJS | 12.0.1 |
| TypeORM / @nestjs/typeorm | 1.1.2 / 12.0.2 |
| pg (node-postgres) | 8.23.1 |
| TypeScript | 6.0.3 |
| Vitest / unplugin-swc | 4.1.11 / 2.0.0 |
| tsx (CLI миграций и скрипты) | 4.23.15 |

Точные версии зависимостей зафиксированы в `be/package-lock.json`.

## 1. PostgreSQL

Нужен PostgreSQL 17 на `localhost:5433` с пользователем `videohost` и тремя базами: `fitness_merge_dev` (разработка), `fitness_merge_test` (только автотесты), `fitness_merge_scratch` (одноразовая, для проверки отката миграций).

**Вариант A — Docker** (создаст все три базы):

```bash
docker compose -f compose/docker-compose.db.yml up -d --wait
```

**Вариант B — портативный PostgreSQL 17 без Docker** (так проверялась работа: Docker Desktop не запускается, если в пути профиля Windows есть кириллица). Распакуйте `postgresql-17.x-windows-x64-binaries.zip` с enterprisedb.com в папку с латинским путем, например `C:\Users\Public\videohost-pg17`, затем:

```bash
cd /c/Users/Public/videohost-pg17
printf 'videohost_dev_only' > pwfile && ./pgsql/bin/initdb.exe -D data -U videohost --pwfile=pwfile -A scram-sha-256 -E UTF8 --locale=C && rm pwfile
```

```bash
/c/Users/Public/videohost-pg17/pgsql/bin/pg_ctl.exe -D /c/Users/Public/videohost-pg17/data -o "-p 5433 -c listen_addresses=localhost" -l /c/Users/Public/videohost-pg17/postgres.log start
```

```bash
for db in fitness_merge_dev fitness_merge_test fitness_merge_scratch; do PGPASSWORD=videohost_dev_only /c/Users/Public/videohost-pg17/pgsql/bin/createdb.exe -h localhost -p 5433 -U videohost $db; done
```

Остановка: `pg_ctl.exe -D <data> stop`.

## 2. Окружение

```bash
cd be && npm ci && cp .env.example .env
```

`.env.example` содержит только учебные значения. `DB_NAME` — база разработки, `DB_TEST_NAME` — база тестов (тесты отказываются работать с базой, имя которой не оканчивается на `_test`/`_scratch`).

Пул: `DB_POOL_MAX=4` соединения на процесс API. Бюджет на машине: 2 процесса API × 4 = 8, CLI миграций или seed — 2, прогон тестов — до 9 (приложение 4 + служебный DataSource 2 + сырые сессии pg 3), psql — 1. Итого ≤ 20 из `max_connections = 100`.

## 3. Миграции

```bash
npm run migration:run
```

```bash
npm run migration:show
```

`synchronize` выключен, схема меняется только миграциями (`be/src/database/migration`): исходная схема (3 миграции), именованные ограничения и CHECK (`170003`), добавление `comments_enabled` к заполненной базе (`170004`), индексы под запросы (`170005`). Откат одной миграции: `npm run migration:revert` — только на учебной базе.

## 4. Учебные данные

```bash
npm run seed:small
```

```bash
npm run seed:large
```

Оба скрипта в одной транзакции пересоздают набор с нуля (повторный запуск безопасен) и сверяют `used_bytes` с суммой `size_bytes`. Малый: 6 пользователей, 8 каналов, 40 видео, 12 тегов, 6 плейлистов, 30 записей избранного. Расширенный (seed генератора 20261101): 600 пользователей, 400 каналов, 12 000 видео, 34 753 связи с тегами, 60 000 записей избранного. Запуск при `NODE_ENV=production` запрещен.

## 5. Запуск API

```bash
npm run build && npm run start:prod
```

Swagger: http://localhost:3000/api, проверка живости: `GET /health`.

Пользователь выбирается заголовком `X-Demo-User-Id: <id из seed>` — это учебный demo-режим, а не аутентификация. Он включается только при `DEMO_AUTH=true`; с `NODE_ENV=production` приложение с `DEMO_AUTH=true` не стартует.

| Операция | Ответ |
|---|---|
| `POST /videos` | 201 — черновик в своем канале, теги и резерв `sizeBytes` атомарно; 400 / 403 / 409 |
| `GET /videos?q=&channelId=&limit=&cursor=` | 200 — публичный каталог published, `nextCursor` |
| `GET /videos/:id` | 200 — published всем, draft/hidden только владельцу; иначе 404 |
| `PATCH /videos/:id` | 200 — `title`/`description` своего видео; 403 для чужого |
| `PATCH /videos/:id/status` | 200 — `published`/`hidden`, повтор безопасен; 409 для draft → hidden |
| `PUT /me/favorites/:videoId` | 204 — идемпотентно; 404 для недоступного видео |
| `DELETE /me/favorites/:videoId` | 204 — в том числе повторно |
| `GET /me/favorites` | 200 — только доступные published-видео с каналами |

```bash
curl -s -X POST localhost:3000/videos -H 'X-Demo-User-Id: 1' -H 'Content-Type: application/json' -d '{"channelId":"1","title":"Утренняя зарядка","sizeBytes":"15000000","tagIds":["1","9"]}'
```

Идентификаторы и байты (bigint) передаются десятичной строкой, даты — ISO 8601 в UTC. Полный набор примеров снимается командой `npm run docs:api` при запущенном API.

## 6. Проверки

Интеграционные тесты на настоящем PostgreSQL (база `DB_TEST_NAME` пересоздается миграциями и малым seed перед прогоном). Запускайте одну тестовую команду за раз:

```bash
npm run test:e2e
```

Vitest настроен на один процесс и последовательные файлы (`pool: 'forks'`, `maxWorkers: 1`, `fileParallelism: false`); гонка проверяется внутри одного теста двумя соединениями. Сохраненный вывод: [docs/test-run.log](docs/test-run.log).

Журнал гонки за квоту (HTTP + две сессии с удержанием транзакции; нужен запущенный API):

```bash
npm run demo:race -- --api http://localhost:3000
```

Фактические ответы 12 SQL-запросов на малом наборе и сравнение с ручными ожиданиями (пересоздает малый seed в `DB_NAME`):

```bash
npm run docs:sql
```

Планы до/после индексов на расширенном наборе (отдельная база, например `DB_NAME=fitness_merge_perf`):

```bash
npm run perf:explain -- after
```

## Docker Compose всего проекта

Оба файла поднимают backend (:8080), frontend (:4200) и PostgreSQL 17 (на хосте :5434, потому что 5432/5433 заняты локальными серверами). Backend при каждом старте сам применяет миграции. Seed не запускается автоматически, потому что он стирает данные.

```bash
cd compose && cp .env.example .env
```

Обычный режим (одна сборка backend, Angular dev-сервер):

```bash
docker compose up --build -d
```

Dev-режим: код `be/` и `fe/` смонтирован в контейнеры, изменения подхватываются без пересборки (отслеживание опросом, потому что события файлов с Windows-хоста не доходят до контейнера):

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Учебные данные (для dev-режима добавьте `-f docker-compose.dev.yml` после `docker compose`):

```bash
docker compose exec backend npm run seed:small
```

Swagger — http://localhost:8080/api (заголовок `X-Demo-User-Id: 1`), frontend — http://localhost:4200. Adminer (сервер `postgres`, логин и пароль из `compose/.env`): `docker compose --profile tools up -d adminer`, затем http://localhost:8081. Остановка: `docker compose down` (с `-v` удалит и данные БД). `docker-compose.prod.yml` ссылается на `Dockerfile.prod`, которых в проекте нет, поэтому он не рабочий.
