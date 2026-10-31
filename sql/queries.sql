-- =====================================================================
-- QUERY 1: Public catalog with channel and author names
-- Product question: Show the 20 most recent published videos.
-- Expected result: Only 'published' videos. Order by published_at DESC, id DESC.
-- =====================================================================
SELECT 
    v.id, 
    v.title, 
    v.published_at, 
    c.title AS channel_title, 
    u.display_name AS author_name
FROM videos v
INNER JOIN channels c ON v.channel_id = c.id
INNER JOIN users u ON c.owner_id = u.id
WHERE v.status = 'published'
ORDER BY v.published_at DESC, v.id DESC
LIMIT 20;

-- =====================================================================
-- QUERY 2: Videos of one channel with status filter
-- Product question: Show all videos (published, draft, hidden) for Channel 1.
-- Expected result: Uses parameters ($1, $2) to filter by channel_id and status.
-- =====================================================================
SELECT 
    id, 
    title, 
    status, 
    size_bytes, 
    created_at
FROM videos
WHERE channel_id = $1 AND status = $2
ORDER BY created_at DESC;

-- =====================================================================
-- QUERY 3: Search published videos by title
-- Product question: Search for videos containing the word "Test".
-- Expected result: Uses ILIKE for case-insensitive search. Returns only published videos.
-- =====================================================================
SELECT 
    id, 
    title, 
    published_at
FROM videos
WHERE status = 'published' 
  AND title ILIKE '%' || $1 || '%'
ORDER BY published_at DESC;

-- =====================================================================
-- QUERY 4: All channels and their published video count
-- Product question: Show all channels and how many published videos they have.
-- Expected result: LEFT JOIN must keep the empty channel (ID 8) with a count of 0.
-- =====================================================================
SELECT 
    c.id, 
    c.title, 
    COUNT(v.id) AS published_videos_count
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id AND v.status = 'published'
GROUP BY c.id, c.title
ORDER BY c.id;

-- =====================================================================
-- QUERY 5: All users and their favorites count
-- Product question: Show all users and how many favorite videos they have.
-- Expected result: LEFT JOIN must keep users with 0 favorites (Users 4, 5, 6).
-- IMPORTANT: Use COUNT(f.video_id) instead of COUNT(*) to get 0 for empty users.
-- =====================================================================
SELECT 
    u.id, 
    u.display_name, 
    COUNT(f.video_id) AS favorites_count
FROM users u
LEFT JOIN favorites f ON f.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY u.id;

-- =====================================================================
-- QUERY 6: Popular tags of published videos
-- Product question: Which tags are used most frequently on published videos?
-- Expected result: Uses GROUP BY and HAVING to filter tags used at least 2 times.
-- =====================================================================
SELECT 
    t.id, 
    t.name, 
    COUNT(vt.video_id) AS usage_count
FROM tags t
INNER JOIN video_tags vt ON vt.tag_id = t.id
INNER JOIN videos v ON v.id = vt.video_id
WHERE v.status = 'published'
GROUP BY t.id, t.name
HAVING COUNT(vt.video_id) >= 2
ORDER BY usage_count DESC;

-- =====================================================================
-- QUERY 7: Published videos without tags
-- Product question: Find published videos that have no tags assigned.
-- Expected result: Should return videos that exist but have no records in video_tags.
-- =====================================================================
SELECT 
    v.id, 
    v.title, 
    v.published_at
FROM videos v
WHERE v.status = 'published' 
  AND NOT EXISTS (
      SELECT 1 FROM video_tags vt WHERE vt.video_id = v.id
  )
ORDER BY v.published_at DESC;

-- =====================================================================
-- QUERY 8: Playlist content of the owner
-- Product question: Show the ordered content of Playlist ID 1.
-- Expected result: Ordered by 'position'. Must show video title and status.
-- =====================================================================
SELECT 
    p.title AS playlist_title,
    pi.position,
    v.title AS video_title,
    v.status AS video_status
FROM playlists p
INNER JOIN playlist_items pi ON pi.playlist_id = p.id
INNER JOIN videos v ON v.id = pi.video_id
WHERE p.id = $1
ORDER BY pi.position ASC;

-- =====================================================================
-- QUERY 9: User's favorites with channel info (Avoiding N+1)
-- Product question: Show User 1's favorite videos, including the channel title.
-- Expected result: A single query that joins favorites, videos, and channels.
-- =====================================================================
SELECT 
    v.id AS video_id,
    v.title AS video_title,
    c.title AS channel_title,
    f.created_at AS favorited_at
FROM favorites f
INNER JOIN videos v ON f.video_id = v.id
INNER JOIN channels c ON v.channel_id = c.id
WHERE f.user_id = $1 
  AND v.status = 'published' -- Hidden/Draft videos must not appear
ORDER BY f.created_at DESC;

-- =====================================================================
-- QUERY 10: Actual bytes per channel vs Stored Counter (Audit)
-- Product question: Check if 'used_bytes' matches the actual sum of videos.
-- Expected result: All statuses included (draft, published, hidden).
-- =====================================================================
SELECT 
    c.id AS channel_id,
    c.title,
    c.used_bytes AS stored_used_bytes,
    COALESCE(SUM(v.size_bytes), 0) AS actual_sum_bytes
FROM channels c
LEFT JOIN videos v ON c.id = v.channel_id
GROUP BY c.id, c.title, c.used_bytes
ORDER BY c.id;

-- =====================================================================
-- QUERY 11: Add to favorites (Idempotent Insert) & Delete
-- Product question: Add a favorite without duplicating if it already exists.
-- Expected result: ON CONFLICT DO NOTHING prevents PK violation errors.
-- =====================================================================
-- INSERT (Use parameters $1 for user_id, $2 for video_id)
INSERT INTO favorites (user_id, video_id) 
VALUES ($1, $2) 
ON CONFLICT (user_id, video_id) DO NOTHING;

-- DELETE (Idempotent: returns 0 rows if it didn't exist, no error)
DELETE FROM favorites 
WHERE user_id = $1 AND video_id = $2;

-- =====================================================================
-- QUERY 12: Catalog pagination by Cursor
-- Product question: Get the next page of the catalog using a cursor.
-- Expected result: Uses the pair (published_at, id) to avoid duplicates.
-- Note: On the first page, you omit the cursor condition.
-- =====================================================================
SELECT 
    v.id, 
    v.title, 
    v.published_at,
    c.title AS channel_title
FROM videos v
INNER JOIN channels c ON v.channel_id = c.id
WHERE v.status = 'published'
  -- For the first page, remove the next line.
  -- For the next pages, replace $1 and $2 with the last row's values.
  AND (v.published_at, v.id) < ($1::timestamptz, $2::bigint) 
ORDER BY v.published_at DESC, v.id DESC
LIMIT 20;