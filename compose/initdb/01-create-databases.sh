#!/bin/sh
# Создает тестовую и одноразовую базы рядом с базой разработки (выполняется один раз при инициализации тома).
set -e
for db in "$VIDEOHOST_TEST_DB" "$VIDEOHOST_SCRATCH_DB"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE \"$db\" OWNER \"$POSTGRES_USER\";"
done
