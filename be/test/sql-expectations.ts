// Ожидаемые ответы на малом наборе выписаны вручную из определения seed (src/database/seeds/small-dataset.ts),
// а не получены тем же SQL. Сравниваются только перечисленные столбцы.
//
// Как получены: published — видео 2, 3, 5 (2025-01-01), 7 (2025-01-02), 9 (2025-01-03) и четные 12..40 (2025-01-05);
// видео i из 11..40 лежит в канале (i % 7) + 1, имеет размер 10000 + 100·i и тег (i % 12) + 1, кроме видео 40 без тегов.

export interface SqlCase {
  label: string;
  index?: number;
  title: string;
  params: unknown[];
  columns: string[];
  expected: unknown[][];
  // Для изменений — число затронутых строк вместо выборки
  affected?: number;
}

const P01 = '2025-01-01T10:00:00.000Z';
const P05 = '2025-01-05T10:00:00.000Z';

export const SQL_CASES: SqlCase[] = [
  {
    label: 'Q1',
    title: 'Каталог, первая страница из 20',
    params: [20],
    columns: ['id'],
    // 15 видео от 2025-01-05 по убыванию id, затем 9, 7 и три видео от 2025-01-01
    expected: [40, 38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 9, 7, 5, 3, 2].map((id) => [String(id)]),
  },
  {
    label: 'Q2',
    title: 'Канал 1, статус published',
    params: [1, 'published'],
    columns: ['id', 'title'],
    // created_at у всего seed одинаковый (now() одной транзакции) — порядок задает id
    expected: [
      ['28', 'Test video 28'],
      ['14', 'Test video 14'],
      ['2', 'V2 - Published with tags'],
    ],
  },
  {
    label: 'Q3',
    title: 'Поиск «Published»',
    params: ['Published', 20],
    columns: ['id'],
    expected: [['9'], ['7'], ['5'], ['3'], ['2']],
  },
  { label: 'Q3', title: 'Поиск «%» ищет буквальный символ', params: ['%', 20], columns: ['id'], expected: [] },
  {
    label: 'Q4',
    title: 'Каналы и число публикаций',
    params: [],
    columns: ['id', 'published_videos_count'],
    expected: [
      ['1', '3'],
      ['2', '3'],
      ['3', '3'],
      ['4', '3'],
      ['5', '3'],
      ['6', '3'],
      ['7', '2'],
      ['8', '0'],
    ],
  },
  {
    label: 'Q5',
    title: 'Пользователи и число записей избранного',
    params: [],
    columns: ['id', 'favorites_count'],
    expected: [
      ['1', '10'],
      ['2', '10'],
      ['3', '10'],
      ['4', '0'],
      ['5', '0'],
      ['6', '0'],
    ],
  },
  {
    label: 'Q6',
    title: 'Теги минимум на 2 опубликованных видео',
    params: [2],
    columns: ['name', 'usage_count'],
    // cardio: 2, 12, 24, 36; strength: 3, 14, 26, 38; health: 9, 20, 32; stretching: 5, 16, 28; advanced: 22, 34; weights: 18, 30
    expected: [
      ['cardio', '4'],
      ['strength', '4'],
      ['health', '3'],
      ['stretching', '3'],
      ['advanced', '2'],
      ['weights', '2'],
    ],
  },
  { label: 'Q7', title: 'Опубликованные без тегов', params: [], columns: ['id'], expected: [['40']] },
  {
    label: 'Q8',
    title: 'Плейлист 1 владельца 1',
    params: [1, 1],
    columns: ['position', 'video_id', 'video_status'],
    expected: [
      [1, '2', 'published'],
      [2, '3', 'published'],
    ],
  },
  { label: 'Q8', title: 'Плейлист 1 глазами пользователя 2', params: [1, 2], columns: ['video_id'], expected: [] },
  { label: 'Q8', title: 'Пустой плейлист 3', params: [3, 1], columns: ['video_id'], expected: [] },
  {
    label: 'Q9',
    title: 'Избранное пользователя 1',
    params: [1],
    columns: ['video_id', 'channel_title'],
    // В избранном видео 2..11; draft 6, 10, 11 и hidden 4, 8 отбрасываются
    expected: [
      ['9', 'Cardio Extremo'],
      ['7', 'Yoga & Relax'],
      ['5', 'Fitness Total'],
      ['3', 'Canal de Ana 2'],
      ['2', 'Canal de Ana'],
    ],
  },
  {
    label: 'Q10',
    title: 'Сверка used_bytes',
    params: [],
    columns: ['channel_id', 'stored_used_bytes', 'actual_sum_bytes', 'difference'],
    expected: [
      ['1', '52800', '52800', '0'],
      ['2', '57200', '57200', '0'],
      ['3', '61600', '61600', '0'],
      ['4', '66000', '66000', '0'],
      ['5', '81500', '81500', '0'],
      ['6', '63000', '63000', '0'],
      ['7', '49400', '49400', '0'],
      ['8', '0', '0', '0'],
    ],
  },
  { label: 'Q11', index: 0, title: 'Добавить (4, 12)', params: [4, 12], columns: [], expected: [], affected: 1 },
  { label: 'Q11', index: 0, title: 'Повтор добавления (4, 12)', params: [4, 12], columns: [], expected: [], affected: 0 },
  { label: 'Q11', index: 1, title: 'Удалить (4, 12)', params: [4, 12], columns: [], expected: [], affected: 1 },
  { label: 'Q11', index: 1, title: 'Повтор удаления (4, 12)', params: [4, 12], columns: [], expected: [], affected: 0 },
  {
    label: 'Q12',
    title: 'После курсора (2025-01-05 10:00, 30)',
    params: [P05, 30, 20],
    columns: ['id'],
    expected: [28, 26, 24, 22, 20, 18, 16, 14, 12, 9, 7, 5, 3, 2].map((id) => [String(id)]),
  },
  {
    label: 'Q12',
    title: 'После курсора (2025-01-01 10:00, 5)',
    params: [P01, 5, 20],
    columns: ['id'],
    expected: [['3'], ['2']],
  },
  {
    label: 'R1а',
    title: 'Разбор 1а: фильтр в ON',
    params: [],
    columns: ['id', 'count_star', 'count_video'],
    expected: [
      ['1', '3', '3'],
      ['2', '3', '3'],
      ['3', '3', '3'],
      ['4', '3', '3'],
      ['5', '3', '3'],
      ['6', '3', '3'],
      ['7', '2', '2'],
      ['8', '1', '0'],
    ],
  },
  {
    label: 'R1б',
    title: 'Разбор 1б: фильтр в WHERE',
    params: [],
    columns: ['id', 'count_video'],
    expected: [
      ['1', '3'],
      ['2', '3'],
      ['3', '3'],
      ['4', '3'],
      ['5', '3'],
      ['6', '3'],
      ['7', '2'],
    ],
  },
  // Видео 2: теги cardio и yoga, в избранном у пользователей 1, 2, 3
  { label: 'R2а', title: 'Разбор 2а: наивный JOIN', params: [2], columns: ['tags_wrong', 'favorites_wrong', 'joined_rows'], expected: [['6', '6', '6']] },
  { label: 'R2б', title: 'Разбор 2б: предварительная агрегация', params: [2], columns: ['tags', 'favorites'], expected: [['2', '3']] },
  { label: 'R2в', title: 'Разбор 2в: COUNT(DISTINCT)', params: [2], columns: ['tags', 'favorites'], expected: [['2', '3']] },
];
