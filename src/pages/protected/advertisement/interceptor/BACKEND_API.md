# Interceptor Ads - Backend API Specification

## Overview

The frontend creates interceptor ads supporting multiple media types: **images**, **GIFs**, and **videos**. Each ad can have an optional redirect link for user interaction. The backend needs to handle media storage and interceptor ad management.

---

## Required API Endpoints

### 1. GET `/management/interceptor/ads/`

**Purpose:** List all interceptor ads

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Summer Sale Banner",
      "description": "Promotional banner for summer sale",
      "media_type": "image",
      "media_url": "https://...",
      "media_filename": "banner.jpg",
      "redirect_link": "https://example.com/promo",
      "display_duration": 5,
      "start_time": "00:05:00",
      "end_time": "00:05:30",
      "created_at": "2025-12-01T10:00:00Z"
    },
    {
      "id": 2,
      "title": "Product Video Ad",
      "description": "Video advertisement for new product",
      "media_type": "video",
      "video": {
        "id": 10,
        "title": "Sample Video",
        "thumbnail": "https://...",
        "duration": 3600
      },
      "video_title": "Sample Video",
      "video_thumbnail": "https://...",
      "redirect_link": "https://example.com/offer",
      "start_time": "00:10:00",
      "end_time": "00:10:30",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Ad title |
| `description` | string | Optional ad description |
| `media_type` | string | Either "image" or "video" |
| `media_url` | string | URL of the image/gif (for image type) |
| `media_filename` | string | Original filename (for image type) |
| `video_title` | string | Video title (for video type) |
| `video_thumbnail` | string | Video thumbnail URL (for video type) |
| `redirect_link` | string | Optional URL for ad click redirect |
| `display_duration` | integer | Seconds to display (for image type) |

---

### 2. POST `/management/interceptor/ads/create/`

**Purpose:** Create a new interceptor ad

**Request Body:** `multipart/form-data`

#### Common Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Ad title |
| `description` | string | No | Optional ad description |
| `media_type` | string | Yes | Either "image" or "video" |
| `start_time` | string | Yes | When ad slot starts (format: `HH:MM:SS`) |
| `end_time` | string | Yes | When ad slot ends (format: `HH:MM:SS`) |
| `redirect_link` | string | No | URL to redirect when user clicks ad |

#### For Image/GIF Ads (additional fields):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `media_file` | file | Yes | Image file (JPG, PNG, GIF, WebP) |
| `display_duration` | integer | Yes | Seconds to display the ad (1-60) |

#### For Video Ads (additional fields):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `video` | integer | Yes | ID of the video (from `/streaming/create-video/` or existing) |

**Expected Response (Success):**
```json
{
  "id": 1,
  "title": "Summer Sale Banner",
  "description": "Promotional banner",
  "media_type": "image",
  "media_url": "https://...",
  "redirect_link": "https://example.com",
  "start_time": "00:05:00",
  "end_time": "00:05:30",
  "created_at": "2025-12-01T10:00:00Z"
}
```

**Expected Response (Error):**
```json
{
  "message": {
    "media_file": ["This field is required."],
    "start_time": ["Invalid time format."]
  }
}
```

---

### 3. GET `/management/interceptor/ad/{id}/`

**Purpose:** Get a single interceptor ad by ID (for editing)

**URL Parameters:**
- `id` - The interceptor ad ID

**Expected Response:**
```json
{
  "id": 1,
  "title": "Summer Sale Banner",
  "description": "Promotional banner for summer sale",
  "media_type": "image",
  "media_url": "https://...",
  "media_filename": "banner.jpg",
  "redirect_link": "https://example.com/promo",
  "display_duration": 5,
  "start_time": "00:05:00",
  "end_time": "00:05:30",
  "video": null,
  "created_at": "2025-12-01T10:00:00Z"
}
```

---

### 4. PUT `/management/interceptor/ads/{id}/update/`

**Purpose:** Update an existing interceptor ad

**URL Parameters:**
- `id` - The interceptor ad ID

**Request Body:** `multipart/form-data`

Same fields as POST create endpoint. Note:
- `media_file` is optional on update - if not provided, existing media is kept
- `media_type` change will require new media file

**Expected Response (Success):**
```json
{
  "id": 1,
  "title": "Updated Banner",
  "description": "Updated description",
  "media_type": "image",
  "media_url": "https://...",
  "redirect_link": "https://example.com",
  "start_time": "00:05:00",
  "end_time": "00:05:30",
  "updated_at": "2025-12-01T12:00:00Z"
}
```

---

### 5. DELETE `/management/interceptor/ads/{id}/`

**Purpose:** Delete an interceptor ad

**URL Parameters:**
- `id` - The interceptor ad ID to delete

**Expected Response:** `204 No Content` or confirmation object

---

### 6. POST `/streaming/create-video/` (Existing Endpoint)

**Purpose:** Upload a new video (used when user uploads instead of selecting existing)

**Request Body:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Video title (frontend uses filename without extension) |
| `description` | string | No | Video description (frontend sends "Interceptor ad video") |
| `video` | file | Yes | The video file (MP4, WebM, MOV) |
| `status` | string | Yes | Video status (frontend sends "published") |

**Expected Response:**
```json
{
  "id": 10,
  "title": "my_video",
  "description": "Interceptor ad video",
  "status": "published",
  "url": "https://...",
  "thumbnail": "https://...",
  "duration": 3600
}
```

The frontend extracts `id` from either `response.data.id` or `response.id`.

---

### 7. GET `/streaming/get-all-videos/` (Existing Endpoint)

**Purpose:** Get list of all videos for dropdown selection

**Expected Response:**
```json
{
  "data": [
    {
      "id": 10,
      "title": "Video Title",
      "thumbnail": "https://..."
    }
  ]
}
```

---

## Frontend Flow

```
User opens Create Interceptor Ad page
           │
           ▼
    ┌──────────────────┐
    │ Choose media     │
    │ type             │
    └──────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────────┐
│ Image/  │ │ Video       │
│ GIF     │ │             │
└─────────┘ └─────────────┘
     │           │
     ▼           ▼
Upload file   ┌─────┴─────┐
     │        ▼           ▼
     │   ┌─────────┐ ┌─────────────┐
     │   │ Upload  │ │ Select      │
     │   │ new     │ │ existing    │
     │   └─────────┘ └─────────────┘
     │        │           │
     │        ▼           │
     │   POST /streaming/ │
     │   create-video/    │
     │        │           │
     │        ▼           ▼
     │   Get video ID ◄───┘
     │        │
     ▼        ▼
POST /management/interceptor/ads/create/
(multipart/form-data)
     │
     ▼
Redirect to list page
```

---

## Validation Notes

The frontend validates:
- **Image/GIF mode:** Media file is required
- **Video mode:** Video is required (either uploaded or selected)
- End time must be greater than start time
- End time cannot exceed video duration (for uploaded videos only)
- Redirect link is optional

The backend should also validate:
- Media type is valid ("image" or "video")
- For image type: media_file is provided and is valid image format
- For video type: video ID exists
- Time format is valid (`HH:MM:SS`)
- End time > Start time
- Display duration is between 1-60 seconds (for image type)
- Redirect link is valid URL format (if provided)

---

## Error Handling

Frontend expects errors in this format:
```json
{
  "message": "Error string"
}
```
or
```json
{
  "message": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

The frontend will join array errors with commas for display.
