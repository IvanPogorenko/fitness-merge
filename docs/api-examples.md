# Примеры запросов и ответов API

Сняты скриптом `be/scripts/api-examples.ts` на малом seed (`npm run seed:small`), 2026-11-01T13:40:42.936Z.
Пользователь выбирается заголовком `X-Demo-User-Id` (учебный demo-режим, см. README).

## GET /videos — первая страница каталога

```http
GET /videos?limit=3
```

Ответ: **200**

```json
{
  "items": [
    {
      "id": "40",
      "title": "Test video 40",
      "description": null,
      "status": "published",
      "sizeBytes": "14000",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "6",
        "title": "Fuerza y Pesas",
        "ownerId": "5",
        "ownerName": "Usuario 5"
      },
      "tags": []
    },
    {
      "id": "38",
      "title": "Test video 38",
      "description": null,
      "status": "published",
      "sizeBytes": "13800",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "4",
        "title": "Yoga & Relax",
        "ownerId": "3",
        "ownerName": "Usuario 3"
      },
      "tags": [
        {
          "id": "3",
          "name": "strength"
        }
      ]
    },
    {
      "id": "36",
      "title": "Test video 36",
      "description": null,
      "status": "published",
      "sizeBytes": "13600",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "2",
        "title": "Canal de Ana 2",
        "ownerId": "1",
        "ownerName": "Usuario 1"
      },
      "tags": [
        {
          "id": "1",
          "name": "cardio"
        }
      ]
    }
  ],
  "nextCursor": "WyIyMDI1LTAxLTA1VDEwOjAwOjAwLjAwMFoiLCIzNiJd"
}
```

## GET /videos — следующая страница по курсору

```http
GET /videos?limit=3&cursor=WyIyMDI1LTAxLTA1VDEwOjAwOjAwLjAwMFoiLCIzNiJd
```

Ответ: **200**

```json
{
  "items": [
    {
      "id": "34",
      "title": "Test video 34",
      "description": null,
      "status": "published",
      "sizeBytes": "13400",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "7",
        "title": "Salud y Nutrición",
        "ownerId": "6",
        "ownerName": "Usuario 6"
      },
      "tags": [
        {
          "id": "11",
          "name": "advanced"
        }
      ]
    },
    {
      "id": "32",
      "title": "Test video 32",
      "description": null,
      "status": "published",
      "sizeBytes": "13200",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "5",
        "title": "Cardio Extremo",
        "ownerId": "4",
        "ownerName": "Usuario 4"
      },
      "tags": [
        {
          "id": "9",
          "name": "health"
        }
      ]
    },
    {
      "id": "30",
      "title": "Test video 30",
      "description": null,
      "status": "published",
      "sizeBytes": "13000",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "3",
        "title": "Fitness Total",
        "ownerId": "2",
        "ownerName": "Usuario 2"
      },
      "tags": [
        {
          "id": "7",
          "name": "weights"
        }
      ]
    }
  ],
  "nextCursor": "WyIyMDI1LTAxLTA1VDEwOjAwOjAwLjAwMFoiLCIzMCJd"
}
```

## GET /videos — поиск по части названия и фильтр по каналу

```http
GET /videos?q=video&channelId=4&limit=5
```

Ответ: **200**

```json
{
  "items": [
    {
      "id": "38",
      "title": "Test video 38",
      "description": null,
      "status": "published",
      "sizeBytes": "13800",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "4",
        "title": "Yoga & Relax",
        "ownerId": "3",
        "ownerName": "Usuario 3"
      },
      "tags": [
        {
          "id": "3",
          "name": "strength"
        }
      ]
    },
    {
      "id": "24",
      "title": "Test video 24",
      "description": null,
      "status": "published",
      "sizeBytes": "12400",
      "commentsEnabled": true,
      "createdAt": "2026-11-01T13:40:18.406Z",
      "publishedAt": "2025-01-05T10:00:00.000Z",
      "channel": {
        "id": "4",
        "title": "Yoga & Relax",
        "ownerId": "3",
        "ownerName": "Usuario 3"
      },
      "tags": [
        {
          "id": "1",
          "name": "cardio"
        }
      ]
    }
  ],
  "nextCursor": null
}
```

## POST /videos — создание черновика с тегами

```http
POST /videos
X-Demo-User-Id: 1
Content-Type: application/json

{
  "channelId": "1",
  "title": "Утренняя зарядка",
  "description": "Комплекс на 15 минут",
  "sizeBytes": "15000000",
  "tagIds": [
    "1",
    "9"
  ]
}
```

Ответ: **201**

```json
{
  "id": "41",
  "title": "Утренняя зарядка",
  "description": "Комплекс на 15 минут",
  "status": "draft",
  "sizeBytes": "15000000",
  "commentsEnabled": true,
  "createdAt": "2026-11-01T13:40:43.067Z",
  "publishedAt": null,
  "channel": {
    "id": "1",
    "title": "Canal de Ana",
    "ownerId": "1",
    "ownerName": "Usuario 1"
  },
  "tags": [
    {
      "id": "1",
      "name": "cardio"
    },
    {
      "id": "9",
      "name": "health"
    }
  ]
}
```

## POST /videos — недостаточно квоты

```http
POST /videos
X-Demo-User-Id: 1
Content-Type: application/json

{
  "channelId": "1",
  "title": "Огромное видео",
  "sizeBytes": "104857600"
}
```

Ответ: **409**

```json
{
  "message": "Channel quota exceeded",
  "error": "Conflict",
  "statusCode": 409
}
```

## POST /videos — неизвестный тег

```http
POST /videos
X-Demo-User-Id: 1
Content-Type: application/json

{
  "channelId": "1",
  "title": "x",
  "sizeBytes": "10",
  "tagIds": [
    "999"
  ]
}
```

Ответ: **400**

```json
{
  "message": "Unknown tag id",
  "error": "Bad Request",
  "statusCode": 400
}
```

## POST /videos — лишнее поле и пустое название

```http
POST /videos
X-Demo-User-Id: 1
Content-Type: application/json

{
  "channelId": "1",
  "title": " ",
  "sizeBytes": "10",
  "status": "published"
}
```

Ответ: **400**

```json
{
  "message": [
    "property status should not exist",
    "title should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## POST /videos — чужой канал

```http
POST /videos
X-Demo-User-Id: 2
Content-Type: application/json

{
  "channelId": "1",
  "title": "x",
  "sizeBytes": "10"
}
```

Ответ: **403**

```json
{
  "message": "Channel belongs to another user",
  "error": "Forbidden",
  "statusCode": 403
}
```

## GET /videos/:id — черновик видит владелец

```http
GET /videos/41
X-Demo-User-Id: 1
```

Ответ: **200**

```json
{
  "id": "41",
  "title": "Утренняя зарядка",
  "description": "Комплекс на 15 минут",
  "status": "draft",
  "sizeBytes": "15000000",
  "commentsEnabled": true,
  "createdAt": "2026-11-01T13:40:43.067Z",
  "publishedAt": null,
  "channel": {
    "id": "1",
    "title": "Canal de Ana",
    "ownerId": "1",
    "ownerName": "Usuario 1"
  },
  "tags": [
    {
      "id": "1",
      "name": "cardio"
    },
    {
      "id": "9",
      "name": "health"
    }
  ]
}
```

## GET /videos/:id — черновик недоступен другим

```http
GET /videos/41
X-Demo-User-Id: 2
```

Ответ: **404**

```json
{
  "message": "Video not found",
  "error": "Not Found",
  "statusCode": 404
}
```

## PATCH /videos/:id — изменение названия и описания

```http
PATCH /videos/41
X-Demo-User-Id: 1
Content-Type: application/json

{
  "title": "Утренняя зарядка (v2)",
  "description": null
}
```

Ответ: **200**

```json
{
  "id": "41",
  "title": "Утренняя зарядка (v2)",
  "description": null,
  "status": "draft",
  "sizeBytes": "15000000",
  "commentsEnabled": true,
  "createdAt": "2026-11-01T13:40:43.067Z",
  "publishedAt": null,
  "channel": {
    "id": "1",
    "title": "Canal de Ana",
    "ownerId": "1",
    "ownerName": "Usuario 1"
  },
  "tags": [
    {
      "id": "1",
      "name": "cardio"
    },
    {
      "id": "9",
      "name": "health"
    }
  ]
}
```

## PATCH /videos/:id — изменить размер нельзя

```http
PATCH /videos/41
X-Demo-User-Id: 1
Content-Type: application/json

{
  "sizeBytes": "1"
}
```

Ответ: **400**

```json
{
  "message": [
    "property sizeBytes should not exist"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## PATCH /videos/:id — чужое видео

```http
PATCH /videos/41
X-Demo-User-Id: 2
Content-Type: application/json

{
  "title": "x"
}
```

Ответ: **403**

```json
{
  "message": "Video belongs to another user",
  "error": "Forbidden",
  "statusCode": 403
}
```

## PATCH /videos/:id/status — публикация

```http
PATCH /videos/41/status
X-Demo-User-Id: 1
Content-Type: application/json

{
  "status": "published"
}
```

Ответ: **200**

```json
{
  "id": "41",
  "title": "Утренняя зарядка (v2)",
  "description": null,
  "status": "published",
  "sizeBytes": "15000000",
  "commentsEnabled": true,
  "createdAt": "2026-11-01T13:40:43.067Z",
  "publishedAt": "2026-11-01T13:40:43.146Z",
  "channel": {
    "id": "1",
    "title": "Canal de Ana",
    "ownerId": "1",
    "ownerName": "Usuario 1"
  },
  "tags": [
    {
      "id": "1",
      "name": "cardio"
    },
    {
      "id": "9",
      "name": "health"
    }
  ]
}
```

## PATCH /videos/:id/status — повтор текущего статуса

```http
PATCH /videos/41/status
X-Demo-User-Id: 1
Content-Type: application/json

{
  "status": "published"
}
```

Ответ: **200**

```json
{
  "id": "41",
  "title": "Утренняя зарядка (v2)",
  "description": null,
  "status": "published",
  "sizeBytes": "15000000",
  "commentsEnabled": true,
  "createdAt": "2026-11-01T13:40:43.067Z",
  "publishedAt": "2026-11-01T13:40:43.146Z",
  "channel": {
    "id": "1",
    "title": "Canal de Ana",
    "ownerId": "1",
    "ownerName": "Usuario 1"
  },
  "tags": [
    {
      "id": "1",
      "name": "cardio"
    },
    {
      "id": "9",
      "name": "health"
    }
  ]
}
```

## PUT /me/favorites/:videoId — добавление

```http
PUT /me/favorites/41
X-Demo-User-Id: 4
```

Ответ: **204**

## PUT /me/favorites/:videoId — повтор

```http
PUT /me/favorites/41
X-Demo-User-Id: 4
```

Ответ: **204**

## PUT /me/favorites/:videoId — черновик недоступен

```http
PUT /me/favorites/1
X-Demo-User-Id: 4
```

Ответ: **404**

```json
{
  "message": "Video not found",
  "error": "Not Found",
  "statusCode": 404
}
```

## GET /me/favorites — список

```http
GET /me/favorites
X-Demo-User-Id: 4
```

Ответ: **200**

```json
[
  {
    "id": "41",
    "title": "Утренняя зарядка (v2)",
    "description": null,
    "status": "published",
    "sizeBytes": "15000000",
    "commentsEnabled": true,
    "createdAt": "2026-11-01T13:40:43.067Z",
    "publishedAt": "2026-11-01T13:40:43.146Z",
    "channel": {
      "id": "1",
      "title": "Canal de Ana",
      "ownerId": "1",
      "ownerName": "Usuario 1"
    },
    "tags": [
      {
        "id": "1",
        "name": "cardio"
      },
      {
        "id": "9",
        "name": "health"
      }
    ],
    "favoritedAt": "2026-11-01T13:40:43.159Z"
  }
]
```

## DELETE /me/favorites/:videoId — удаление

```http
DELETE /me/favorites/41
X-Demo-User-Id: 4
```

Ответ: **204**

## DELETE /me/favorites/:videoId — повторное удаление

```http
DELETE /me/favorites/41
X-Demo-User-Id: 4
```

Ответ: **204**

## PATCH /videos/:id/status — скрытие

```http
PATCH /videos/41/status
X-Demo-User-Id: 1
Content-Type: application/json

{
  "status": "hidden"
}
```

Ответ: **200**

```json
{
  "id": "41",
  "title": "Утренняя зарядка (v2)",
  "description": null,
  "status": "hidden",
  "sizeBytes": "15000000",
  "commentsEnabled": true,
  "createdAt": "2026-11-01T13:40:43.067Z",
  "publishedAt": "2026-11-01T13:40:43.146Z",
  "channel": {
    "id": "1",
    "title": "Canal de Ana",
    "ownerId": "1",
    "ownerName": "Usuario 1"
  },
  "tags": [
    {
      "id": "1",
      "name": "cardio"
    },
    {
      "id": "9",
      "name": "health"
    }
  ]
}
```

## GET /videos/:id — скрытое видео недоступно

```http
GET /videos/41
```

Ответ: **404**

```json
{
  "message": "Video not found",
  "error": "Not Found",
  "statusCode": 404
}
```
