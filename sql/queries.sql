-- 12 запросов видеохостинга. Перед каждым: вопрос продукта, параметры, единица результата и критерий.
-- Ожидаемые ответы на малом наборе (npm run seed:small) и фактический результат — docs/sql-results.md.
-- Проверка автоматически: be/test/sql-queries.e2e-spec.ts.

-- =====================================================================
-- QUERY 1: Публичный каталог с названием канала и именем автора
-- Вопрос: какие опубликованные видео показать на первой странице каталога?
-- Параметры: $1 — размер страницы (20)
-- Единица результата: видео
-- Критерий: только published; порядок published_at DESC, id DESC; LIMIT
-- =====================================================================
SELECT v.id, v.title, v.published_at, c.title AS channel_title, u.display_name AS author_name
FROM videos v
JOIN channels c ON c.id = v.channel_id
JOIN users u ON u.id = c.owner_id
WHERE v.status = 'published'
ORDER BY v.published_at DESC, v.id DESC
LIMIT $1;

-- =====================================================================
-- QUERY 2: Видео одного канала с фильтром по статусу
-- Вопрос: какие видео со статусом $2 есть в канале $1 (экран владельца)?
-- Параметры: $1 — channel_id, $2 — статус (draft | published | hidden)
-- Единица результата: видео
-- Критерий: явный список столбцов; id как второй ключ сортировки (у видео одного seed одинаковый created_at)
-- =====================================================================
SELECT id, title, status, size_bytes, created_at
FROM videos
WHERE channel_id = $1 AND status = $2
ORDER BY created_at DESC, id DESC;

-- =====================================================================
-- QUERY 3: Поиск опубликованных видео по части названия
-- Вопрос: какие опубликованные видео содержат в названии строку, введенную пользователем?
-- Параметры: $1 — строка поиска; $2 — размер страницы
-- Единица результата: видео
-- Критерий: параметризованный ILIKE; символы % и _ во вводе ищутся буквально (экранируются); пустой результат допустим
-- =====================================================================
SELECT id, title, published_at
FROM videos
WHERE status = 'published'
  AND title ILIKE '%' || replace(replace(replace($1, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
ORDER BY published_at DESC, id DESC
LIMIT $2;

-- =====================================================================
-- QUERY 4: Все каналы и число опубликованных видео
-- Вопрос: сколько опубликованных видео у каждого канала, включая каналы без публикаций?
-- Параметры: нет
-- Единица результата: канал
-- Критерий: LEFT JOIN с фильтром статуса в ON; канал без публикаций остается с нулем
-- =====================================================================
SELECT c.id, c.title, COUNT(v.id) AS published_videos_count
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id AND v.status = 'published'
GROUP BY c.id, c.title
ORDER BY c.id;

-- =====================================================================
-- QUERY 5: Все пользователи и число записей избранного
-- Вопрос: сколько видео в избранном у каждого пользователя?
-- Параметры: нет
-- Единица результата: пользователь
-- Критерий: COUNT(f.video_id), а не COUNT(*) после LEFT JOIN — иначе пользователь без избранного получит 1
-- =====================================================================
SELECT u.id, u.display_name, COUNT(f.video_id) AS favorites_count
FROM users u
LEFT JOIN favorites f ON f.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY u.id;

-- =====================================================================
-- QUERY 6: Популярные теги опубликованных видео
-- Вопрос: какие теги стоят хотя бы на $1 опубликованных видео?
-- Параметры: $1 — порог (2)
-- Единица результата: тег
-- Критерий: GROUP BY по тегу; HAVING COUNT(*) >= порога; устойчивый порядок
-- =====================================================================
SELECT t.id, t.name, COUNT(*) AS usage_count
FROM tags t
JOIN video_tags vt ON vt.tag_id = t.id
JOIN videos v ON v.id = vt.video_id
WHERE v.status = 'published'
GROUP BY t.id, t.name
HAVING COUNT(*) >= $1
ORDER BY usage_count DESC, t.name;

-- =====================================================================
-- QUERY 7: Опубликованные видео без тегов
-- Вопрос: какие опубликованные видео не размечены тегами?
-- Параметры: нет
-- Единица результата: видео
-- Критерий: NOT EXISTS по video_tags
-- =====================================================================
SELECT v.id, v.title, v.published_at
FROM videos v
WHERE v.status = 'published'
  AND NOT EXISTS (SELECT 1 FROM video_tags vt WHERE vt.video_id = v.id)
ORDER BY v.published_at DESC, v.id DESC;

-- =====================================================================
-- QUERY 8: Содержимое плейлиста владельца
-- Вопрос: что лежит в плейлисте $1 пользователя $2 и в каком порядке?
-- Параметры: $1 — playlist_id, $2 — owner_id из контекста запроса
-- Единица результата: связь «видео в плейлисте»
-- Критерий: только плейлист этого владельца; порядок position; название и статус видео
-- =====================================================================
SELECT pi.position, v.id AS video_id, v.title AS video_title, v.status AS video_status
FROM playlists p
JOIN playlist_items pi ON pi.playlist_id = p.id
JOIN videos v ON v.id = pi.video_id
WHERE p.id = $1 AND p.owner_id = $2
ORDER BY pi.position;

-- =====================================================================
-- QUERY 9: Избранное пользователя с каналом каждого видео
-- Вопрос: какие доступные видео пользователь $1 добавил в избранное и из каких они каналов?
-- Параметры: $1 — user_id
-- Единица результата: связь «видео в избранном»
-- Критерий: один запрос с JOIN вместо запроса канала на каждое видео (без N+1); только published
-- =====================================================================
SELECT v.id AS video_id, v.title AS video_title, c.title AS channel_title, f.created_at AS favorited_at
FROM favorites f
JOIN videos v ON v.id = f.video_id
JOIN channels c ON c.id = v.channel_id
WHERE f.user_id = $1 AND v.status = 'published'
ORDER BY f.created_at DESC, f.video_id DESC;

-- =====================================================================
-- QUERY 10: Фактические байты по каналам и расхождение со счетчиком
-- Вопрос: совпадает ли сохраненный used_bytes с суммой размеров всех видео канала?
-- Параметры: нет
-- Единица результата: канал
-- Критерий: COALESCE для пустых каналов; учитываются все статусы видео
-- =====================================================================
SELECT c.id AS channel_id, c.title, c.used_bytes AS stored_used_bytes,
       COALESCE(SUM(v.size_bytes), 0) AS actual_sum_bytes,
       c.used_bytes - COALESCE(SUM(v.size_bytes), 0) AS difference
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id
GROUP BY c.id, c.title, c.used_bytes
ORDER BY c.id;

-- =====================================================================
-- QUERY 11: Добавление в избранное и удаление из него
-- Вопрос: как добавить видео в избранное так, чтобы повтор не создавал дубль, и как его удалить?
-- Параметры: $1 — user_id, $2 — video_id
-- Единица результата: связь «пользователь — видео»
-- Критерий: параметры вместо склейки строк; повтор вставки — 0 строк, без ошибки; повтор удаления — 0 строк
-- =====================================================================
INSERT INTO favorites (user_id, video_id)
VALUES ($1, $2)
ON CONFLICT ON CONSTRAINT pk_favorites DO NOTHING;

DELETE FROM favorites
WHERE user_id = $1 AND video_id = $2;

-- =====================================================================
-- QUERY 12: Следующая страница каталога по курсору
-- Вопрос: что показать после последней строки предыдущей страницы?
-- Параметры: $1 — published_at последней строки, $2 — ее id, $3 — размер страницы
-- Единица результата: видео
-- Критерий: та же пара (published_at, id) в WHERE и ORDER BY; на первой странице условие курсора отсутствует (запрос 1)
-- =====================================================================
SELECT v.id, v.title, v.published_at, c.title AS channel_title
FROM videos v
JOIN channels c ON c.id = v.channel_id
WHERE v.status = 'published'
  AND (v.published_at, v.id) < ($1::timestamptz, $2::bigint)
ORDER BY v.published_at DESC, v.id DESC
LIMIT $3;


-- #####################################################################
-- РАЗБОР 1: фильтр статуса в ON и в WHERE при LEFT JOIN channels -> videos
-- #####################################################################
-- 1а. Фильтр в ON: канал без публикаций остается, COUNT(v.id) = 0, а COUNT(*) = 1
SELECT c.id, COUNT(*) AS count_star, COUNT(v.id) AS count_video
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id AND v.status = 'published'
GROUP BY c.id
ORDER BY c.id;

-- 1б. Фильтр в WHERE: условие отбрасывает строки с v.status IS NULL, LEFT JOIN превращается во внутренний,
--     канал 8 исчезает из результата
SELECT c.id, COUNT(v.id) AS count_video
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id
WHERE v.status = 'published'
GROUP BY c.id
ORDER BY c.id;

-- #####################################################################
-- РАЗБОР 2: видео с двумя тегами и тремя добавлениями в избранное
-- #####################################################################
-- 2а. Ошибка: JOIN двух независимых связей 1:N дает 2 x 3 = 6 строк, оба счетчика равны 6
SELECT v.id, COUNT(vt.tag_id) AS tags_wrong, COUNT(f.user_id) AS favorites_wrong, COUNT(*) AS joined_rows
FROM videos v
LEFT JOIN video_tags vt ON vt.video_id = v.id
LEFT JOIN favorites f ON f.video_id = v.id
WHERE v.id = $1
GROUP BY v.id;

-- 2б. Исправление: каждая связь агрегируется отдельно до соединения (единица результата — видео)
SELECT v.id, COALESCE(t.tags, 0) AS tags, COALESCE(fv.favorites, 0) AS favorites
FROM videos v
LEFT JOIN (SELECT video_id, COUNT(*) AS tags FROM video_tags GROUP BY video_id) t ON t.video_id = v.id
LEFT JOIN (SELECT video_id, COUNT(*) AS favorites FROM favorites GROUP BY video_id) fv ON fv.video_id = v.id
WHERE v.id = $1;

-- 2в. Допустимая альтернатива: COUNT(DISTINCT ...) по ключу каждой связи
SELECT v.id, COUNT(DISTINCT vt.tag_id) AS tags, COUNT(DISTINCT f.user_id) AS favorites
FROM videos v
LEFT JOIN video_tags vt ON vt.video_id = v.id
LEFT JOIN favorites f ON f.video_id = v.id
WHERE v.id = $1
GROUP BY v.id;
