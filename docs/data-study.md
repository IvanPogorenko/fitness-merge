Следующий код позволяет проверить, что поле `used_bytes` таблицы `channels` точно совпадает с суммой `size_bytes` всех её видео.

```sql
SELECT 
    c.id AS channel_id, -- Alias to avoid ambiguity with videos.id
    c.title,
    c.used_bytes AS quota_usada_guardada,
    COALESCE(SUM(v.size_bytes), 0) AS suma_real_de_videos -- Returns 0 if no videos exist
FROM channels c
LEFT JOIN videos v ON c.id = v.channel_id -- Keeps empty channels in the result
GROUP BY c.id, c.title, c.used_bytes
ORDER BY c.id;
```

## 2. Пограничный случай: канал без видео

Следующий код позволяет проверить, что Канал 8 действительно остался без единого видео, как мы определили в скрипте Seed.

```sql
-- Returns the channel without any associated videos (Channel 8)
SELECT id, title FROM channels 
WHERE id NOT IN (SELECT channel_id FROM videos);
```

## 3. Пограничный случай: пользователи без избранного

Следующий код позволяет проверить, что у пользователей 4, 5 и 6 нет ни одной связи в таблице `favorites`.

```sql
-- Returns users with no favorites (Users 4, 5, and 6)
SELECT id, display_name FROM users 
WHERE id NOT IN (SELECT user_id FROM favorites);
```

## 4. Пограничный случай: пустые плейлисты

Следующий код позволяет проверить, что существуют созданные плейлисты, но без единого назначенного видео в промежуточной таблице.

```sql
-- Returns playlists with no items (Playlists 3, 4, 5, and 6)
SELECT id, title FROM playlists 
WHERE id NOT IN (SELECT playlist_id FROM playlist_items);
```

## 5. Пограничный случай: видео без тегов

Следующий код позволяет проверить, что у видео 1, 8 и 40 нет связанных тегов. Это критически важно для будущего тестирования запросов с `NOT EXISTS` или `LEFT JOIN`.

```sql
-- Returns videos with no tags (Videos 1, 8, and 40)
SELECT id, title FROM videos 
WHERE id NOT IN (SELECT video_id FROM video_tags);
```

## 6. Пограничный случай: дублирующиеся даты публикации

Следующий код позволяет проверить, что существуют несколько видео с одинаковой датой публикации. Это принципиально важно для тестирования курсорной пагинации и гарантии того, что `id` используется как критерий разрешения ничьих.

```sql
-- Returns publication dates that have more than one video (For cursor pagination testing)
SELECT published_at, COUNT(*) AS quantity 
FROM videos 
WHERE published_at IS NOT NULL 
GROUP BY published_at 
HAVING COUNT(*) > 1;
```