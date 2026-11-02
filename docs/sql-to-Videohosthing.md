Запрос 4: LEFT JOIN и фильтр в ON
Следующий код позволяет нам проверить, что при размещении фильтра status = 'published' внутри ON, канал без видео (канал 8) сохраняется в результате с количеством 0.

sql
-- Query 4: All channels and their published video count
-- Key: The filter is in the ON clause to keep empty channels.
SELECT 
    c.id, 
    c.title, 
    COUNT(v.id) AS published_videos_count
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id AND v.status = 'published'
GROUP BY c.id, c.title
ORDER BY c.id;
Запрос 10: Аудит квоты
Следующий код позволяет нам проверить, что реальные байты видео совпадают со счетчиком канала, независимо от статуса видео.

sql
-- Query 10: Actual bytes per channel vs Stored Counter (Audit)
-- Key: Using COALESCE to handle empty channels.
SELECT 
    c.id AS channel_id, 
    c.title, 
    c.used_bytes AS stored_used_bytes, 
    COALESCE(SUM(v.size_bytes), 0) AS actual_sum_bytes
FROM channels c
LEFT JOIN videos v ON c.id = v.channel_id
GROUP BY c.id, c.title, c.used_bytes
ORDER BY c.id;
Запрос 11: Добавление в избранное
Следующий код позволяет нам проверить, что добавление в избранное безопасно и не создает дубликатов при многократном выполнении.

sql
-- Query 11: Add to favorites (Idempotent Insert)
-- Key: ON CONFLICT DO NOTHING prevents duplicate key violations.
INSERT INTO favorites (user_id, video_id) 
VALUES ($1, $2) 
ON CONFLICT (user_id, video_id) DO NOTHING;
Запрос 12: Пагинация по курсору
Следующий код позволяет нам проверить пагинацию по курсору, гарантируя, что видео не повторяются и не пропускаются при наличии одинаковых дат.

sql
-- Query 12: Catalog pagination by Cursor
-- Key: Uses the pair (published_at, id) to avoid duplicates on the next page.
SELECT 
    v.id, 
    v.title, 
    v.published_at,
    c.title AS channel_title
FROM videos v
INNER JOIN channels c ON v.channel_id = c.id
WHERE v.status = 'published'
  AND (v.published_at, v.id) < ($1::timestamptz, $2::bigint) -- Cursor condition
ORDER BY v.published_at DESC, v.id DESC
LIMIT 20;