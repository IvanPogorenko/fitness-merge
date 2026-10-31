import dataSource from '../../../typeorm.config';

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('Success connection');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    console.log('Transaction initiated.');

    await queryRunner.query(`
      TRUNCATE TABLE favorites, playlist_items, playlists, video_tags, videos, tags, channels, users RESTART IDENTITY CASCADE;
    `);
    console.log('Table clear');

    console.log(' Inserting 6 Users...');
    for (let i = 1; i <= 6; i++) {
      await queryRunner.query(
        `INSERT INTO users (display_name, email) VALUES ($1, $2)`,
        [`Usuario ${i}`, `user${i}@example.com`]
      );
    }

    console.log(' Inserting 8 Channels...');
    const channelsData = [
      { owner_id: 1, title: 'Canal de Ana', quota: 104857600 },
      { owner_id: 1, title: 'Canal de Ana 2', quota: 104857600 },
      { owner_id: 2, title: 'Fitness Total', quota: 104857600 },
      { owner_id: 3, title: 'Yoga & Relax', quota: 104857600 },
      { owner_id: 4, title: 'Cardio Extremo', quota: 104857600 },
      { owner_id: 5, title: 'Fuerza y Pesas', quota: 104857600 },
      { owner_id: 6, title: 'Salud y Nutrición', quota: 104857600 },
      { owner_id: 2, title: 'Canal Vacío (Caso Límite)', quota: 104857600 },
    ];

    for (const channel of channelsData) {
      await queryRunner.query(
        `INSERT INTO channels (owner_id, title, quota_bytes) VALUES ($1, $2, $3)`,
        [channel.owner_id, channel.title, channel.quota]
      );
    }

    // ==========================================
    // BLOCK B: TAGS AND VIDEOS (Ahora sí, dentro del try)
    // ==========================================
    console.log(' Inserting Tags...');
    const tagsData = ['cardio', 'yoga', 'strength', 'nutrition', 'stretching', 'HIIT', 'weights', 'meditation', 'health', 'beginners', 'advanced', 'relaxation'];
    for (const tagName of tagsData) {
      await queryRunner.query(`INSERT INTO tags (name) VALUES (LOWER(TRIM($1)))`, [tagName]);
    }

    console.log(' Inserting 40 Videos...');
    const videosData = [
      { channel: 1, title: 'V1 - Draft without tags', status: 'draft', size: 1000, date: null, tags: [] },
      { channel: 1, title: 'V2 - Published with tags', status: 'published', size: 2000, date: '2025-01-01T10:00:00Z', tags: [1, 2] }, // Corregido 'tittle' -> 'title'
      { channel: 2, title: 'V3 - Published same date', status: 'published', size: 3000, date: '2025-01-01T10:00:00Z', tags: [3] },
      { channel: 2, title: 'V4 - Hidden', status: 'hidden', size: 4000, date: null, tags: [4] },
      { channel: 3, title: 'V5 - Published same date', status: 'published', size: 5000, date: '2025-01-01T10:00:00Z', tags: [5, 6] },
      { channel: 3, title: 'V6 - Draft', status: 'draft', size: 6000, date: null, tags: [7] },
      { channel: 4, title: 'V7 - Published', status: 'published', size: 7000, date: '2025-01-02T10:00:00Z', tags: [8] },
      { channel: 4, title: 'V8 - Hidden without tags', status: 'hidden', size: 8000, date: null, tags: [] },
      { channel: 5, title: 'V9 - Published', status: 'published', size: 9000, date: '2025-01-03T10:00:00Z', tags: [9] },
      { channel: 5, title: 'V10 - Draft', status: 'draft', size: 10000, date: null, tags: [10, 11] },
    ];

    for (let i = 11; i <= 40; i++) {
      videosData.push({
        channel: (i % 7) + 1,
        title: `Test video ${i}`,
        status: i % 2 === 0 ? 'published' : 'draft',
        size: 10000 + (i * 100),
        date: i % 2 === 0 ? '2025-01-05T10:00:00Z' : null,
        tags: [(i % 12) + 1]
      });
    }

    for (let i = 0; i < videosData.length; i++) {
      const video = videosData[i];

      const result = await queryRunner.query(
        `INSERT INTO videos (channel_id, title, status, size_bytes, storage_key, published_at) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [video.channel, video.title, video.status, video.size, `vid_${i + 1}.mp4`, video.date]
      );

      const newVideoId = result[0].id;

      await queryRunner.query(
        `UPDATE channels SET used_bytes = used_bytes + $1 WHERE id = $2`,
        [video.size, video.channel]
      );

      for (const tagId of video.tags) {
        await queryRunner.query(
          `INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2)`,
          [newVideoId, tagId]
        );
      }
    }
    console.log(' Videos, Tags and Quotas updated.');
    
    console.log('inseting 6 playlist');
     const playlistsData = [
      { owner_id: 1, title: 'My Cardio Favorites' },
      { owner_id: 1, title: 'Yoga Routine' },
      { owner_id: 1, title: 'Empty Playlist (Edge Case)' },
      { owner_id: 2, title: 'Full Strength' },
      { owner_id: 2, title: 'Beginners Guide' },
      { owner_id: 3, title: 'Relaxation' },
    ];

    for (const playlist of playlistsData) {
      await queryRunner.query(
        `INSERT INTO playlists (owner_id, title) VALUES ($1, $2)`,
        [playlist.owner_id, playlist.title]
      );
    }

    console.log(' Inserting Playlist Items...');
    // We add videos to playlists 1 and 2. 
    // Remember the UNIQUE(playlist_id, position) constraint! 
    await queryRunner.query(`INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (1, 2, 1)`);
    await queryRunner.query(`INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (1, 3, 2)`);
    await queryRunner.query(`INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (2, 5, 1)`);
    // Playlist 3 remains empty.

    console.log(' Inserting Favorites (30+ relationships)...');
    // We generate 30 favorites: 10 for User 1, 10 for User 2, 10 for User 3.
    // Users 4, 5, and 6 will have 0 favorites (Edge case).
    let favoriteCount = 0;
    
    for (let userId = 1; userId <= 3; userId++) {
      for (let i = 1; i <= 10; i++) {
        // Assign videos with IDs from 2 to 11 to ensure they are likely published videos
        const videoId = i + 1; 
        
        // ON CONFLICT DO NOTHING prevents errors if a duplicate is accidentally generated
        await queryRunner.query(
          `INSERT INTO favorites (user_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, videoId]
        );
        favoriteCount++;
      }
    }
    console.log(` Inserted ${favoriteCount} favorites.`);


    // 4. Confirm the entire transaction
    await queryRunner.commitTransaction();
    console.log(' Success transaction (COMMIT).');

  } catch (error) {
    console.error(' Error detected:', error);
  } finally {
    console.log('Closing database connection...');
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    console.log('Leaving...');
    process.exit(0);
  }
}

runSeed();