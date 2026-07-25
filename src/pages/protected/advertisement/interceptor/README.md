# Interceptor Ads Module

This module allows creating and managing interceptor ads - advertisements that are inserted into videos at specific time intervals.

## Overview

Interceptor ads work by associating an ad timing configuration with a video. When the video plays, the system knows when to display ads based on the start and end times configured.

## Files

- `list.tsx` - Lists all interceptor ads with delete functionality
- `create.tsx` - Form to create new interceptor ads

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/management/interceptor/ads/` | Get all interceptor ads |
| POST | `/management/interceptor/ads/create/` | Create a new interceptor ad |
| DELETE | `/management/interceptor/ads/{id}/` | Delete an interceptor ad |

## Create Flow

### 1. Video Selection
Users can either:
- **Upload a new video** - Drag & drop or click to upload (MP4, WebM, MOV)
- **Select an existing video** - Choose from previously uploaded videos

These options are mutually exclusive:
- If a video is uploaded, the dropdown is disabled
- If an existing video is selected, the upload area is disabled

### 2. Ad Timing Configuration
- **Start Time** - When the ad slot begins (format: `HH:MM:SS`)
- **End Time** - When the ad slot ends (format: `HH:MM:SS`)
- **Duration Preview** - Shows calculated ad slot duration

### 3. Submit Process

```
┌─────────────────────────────────────────────────────────┐
│                    handleSubmit()                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Validate inputs                                      │
│     - Video must be uploaded OR selected                 │
│     - End time must be after start time                  │
│     - End time cannot exceed video duration              │
│                                                          │
│  2. Get/Create Video ID                                  │
│     ┌──────────────────────────────────────────┐        │
│     │ IF videoFile exists:                      │        │
│     │   - Create FormData with video details    │        │
│     │   - Call api.createVideo(formData)        │        │
│     │   - Extract videoId from response         │        │
│     │                                           │        │
│     │ ELSE (existing video selected):           │        │
│     │   - Use formData.selectedVideo as videoId │        │
│     └──────────────────────────────────────────┘        │
│                                                          │
│  3. Create Interceptor Ad                                │
│     - Call api.createInterceptorAd({                     │
│         video: videoId,                                  │
│         start_time: "HH:MM:SS",                          │
│         end_time: "HH:MM:SS"                             │
│       })                                                 │
│                                                          │
│  4. Navigate to list on success                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Payload Structure

### Create Video (when uploading new)
```typescript
FormData {
  title: string,        // Filename without extension
  description: string,  // "Interceptor ad video"
  video: File,          // The video file
  status: "published"
}
```

### Create Interceptor Ad
```typescript
{
  video: number,      // Video ID
  start_time: string, // "HH:MM:SS" format
  end_time: string    // "HH:MM:SS" format
}
```

## Progress Indicators

| Progress % | Stage |
|------------|-------|
| 10% | Starting video upload |
| 30% | Uploading video |
| 50% | Using existing video (no upload) |
| 70% | Video upload complete |
| 85% | Creating interceptor ad |
| 100% | Complete |

## Validation Rules

1. **Video Required** - Must upload or select a video
2. **Time Format** - Must be `HH:MM:SS`
3. **Time Logic** - End time > Start time
4. **Duration Check** - End time cannot exceed uploaded video duration
