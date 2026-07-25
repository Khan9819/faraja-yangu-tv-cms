# Google Drive Video Import — Backend Implementation Guide

This document describes exactly what needs to be implemented on the Django backend to support the **Google Drive video import** feature added to the CMS frontend.

---

## Overview

The CMS now allows admins to paste a Google Drive share link instead of uploading a video file from their local machine. The backend is responsible for:

1. Receiving the Google Drive URL and video ID
2. Downloading the file from Google Drive in the background
3. Reporting download/processing progress to the frontend via a polling endpoint
4. Once downloaded, processing the video through the existing HLS pipeline

---

## New API Endpoints Required

### 1. `POST /streaming/import-from-google-drive/`

Triggers a background task to download a video file from Google Drive and attach it to an existing video record.

#### Request

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "videoId": 42,
  "google_drive_url": "https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view?usp=sharing"
}
```

| Field              | Type    | Required | Description                                      |
|--------------------|---------|----------|--------------------------------------------------|
| `videoId`          | integer | Yes      | ID of the video record (already created via `POST /streaming/create-video/`) |
| `google_drive_url` | string  | Yes      | A valid Google Drive share link                  |

#### Response — Success (`200 OK`)
```json
{
  "success": true,
  "message": "Google Drive import started.",
  "data": {
    "video_id": 42,
    "task_id": "abc123-def456-ghi789",
    "status": "pending"
  }
}
```

#### Response — Error (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid Google Drive URL."
}
```

#### Response — Error (`404 Not Found`)
```json
{
  "success": false,
  "message": "Video record not found."
}
```

---

### 2. `GET /streaming/google-drive-import-status/`

Polls the current status of a Google Drive import task.

#### Request

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Param     | Type    | Required | Description              |
|-----------|---------|----------|--------------------------|
| `videoId` | integer | Yes      | ID of the video record   |

#### Response — Success (`200 OK`)
```json
{
  "success": true,
  "data": {
    "video_id": 42,
    "status": "downloading",
    "progress": 45,
    "message": "Downloading from Google Drive... 45%"
  }
}
```

**Possible `status` values:**

| Status         | Description                                                |
|----------------|------------------------------------------------------------|
| `pending`      | Task queued but not started yet                            |
| `downloading`  | File is being downloaded from Google Drive                 |
| `processing`   | File downloaded, now being processed (HLS conversion etc.) |
| `completed`    | Import and processing finished successfully                |
| `failed`       | Import failed (see `message` for details)                  |

**`progress`** is an integer from `0` to `100`:
- `0–80`: Download progress
- `80–95`: Post-download processing (moving file, triggering HLS pipeline)
- `95–100`: Finalization

#### Response — Error (`404 Not Found`)
```json
{
  "success": false,
  "message": "No import task found for this video."
}
```

---

## Backend Implementation Details

### 1. Google Drive File Download

#### Extracting the File ID

The frontend validates URLs matching these patterns:
- `https://drive.google.com/file/d/<FILE_ID>/...`
- `https://drive.google.com/open?id=<FILE_ID>`
- `https://docs.google.com/.../d/<FILE_ID>/...`

Extract the file ID using a regex on the backend as well:

```python
import re

def extract_google_drive_file_id(url: str) -> str | None:
    """Extract Google Drive file ID from various URL formats."""
    patterns = [
        r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)',
        r'docs\.google\.com/.*/d/([a-zA-Z0-9_-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None
```

#### Downloading the File

Use the Google Drive direct download URL. For files shared as **"Anyone with the link"**, you can download without OAuth:

```python
import requests

def download_from_google_drive(file_id: str, destination: str, progress_callback=None):
    """
    Download a file from Google Drive using the file ID.
    The file must be shared as 'Anyone with the link can view'.
    """
    session = requests.Session()

    # Initial request
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    response = session.get(url, stream=True)

    # Handle large file confirmation page (virus scan warning)
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            url = f"https://drive.google.com/uc?export=download&confirm={value}&id={file_id}"
            response = session.get(url, stream=True)
            break

    # Get total file size if available
    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0
    chunk_size = 32 * 1024  # 32KB chunks

    with open(destination, 'wb') as f:
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if progress_callback and total_size > 0:
                    progress = int((downloaded / total_size) * 80)  # 0-80% for download
                    progress_callback(progress)

    return destination
```

> **Note:** For very large files or private files, consider using the **Google Drive API v3** with a service account. This requires:
> - A Google Cloud project with the Drive API enabled
> - A service account with credentials (JSON key file)
> - The file shared with the service account email, OR the file set to "Anyone with the link"

### 2. Database Model Changes

Add a model (or fields on the existing `Video` model) to track Google Drive import state:

```python
# Option A: New model
class GoogleDriveImport(models.Model):
    video = models.OneToOneField('Video', on_delete=models.CASCADE, related_name='gdrive_import')
    google_drive_url = models.URLField()
    google_drive_file_id = models.CharField(max_length=255)
    task_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('downloading', 'Downloading'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending',
    )
    progress = models.IntegerField(default=0)
    message = models.TextField(default='', blank=True)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_drive_imports'
```

```python
# Option B: Add fields to existing Video model
class Video(models.Model):
    # ... existing fields ...
    gdrive_url = models.URLField(null=True, blank=True)
    gdrive_file_id = models.CharField(max_length=255, null=True, blank=True)
    gdrive_import_status = models.CharField(max_length=20, null=True, blank=True)
    gdrive_import_progress = models.IntegerField(default=0)
    gdrive_import_message = models.TextField(default='', blank=True)
    gdrive_task_id = models.CharField(max_length=255, null=True, blank=True)
```

### 3. Background Task (Celery)

The download must run as a background task. Use **Celery** (which the project likely already uses for HLS processing):

```python
from celery import shared_task

@shared_task(bind=True)
def import_video_from_google_drive(self, video_id: int, google_drive_url: str):
    """
    Background task to download a video from Google Drive and trigger processing.
    """
    from streaming.models import Video, GoogleDriveImport
    import tempfile
    import os

    try:
        video = Video.objects.get(id=video_id)
        gdrive_import = GoogleDriveImport.objects.get(video=video)

        # Extract file ID
        file_id = extract_google_drive_file_id(google_drive_url)
        if not file_id:
            gdrive_import.status = 'failed'
            gdrive_import.message = 'Could not extract file ID from URL'
            gdrive_import.save()
            return

        # Update status to downloading
        gdrive_import.status = 'downloading'
        gdrive_import.message = 'Downloading from Google Drive...'
        gdrive_import.save()

        # Download to temp file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, f'video_{video_id}.mp4')

        def update_progress(progress):
            gdrive_import.progress = progress
            gdrive_import.message = f'Downloading from Google Drive... {progress}%'
            gdrive_import.save(update_fields=['progress', 'message', 'updated_at'])

        download_from_google_drive(file_id, temp_path, progress_callback=update_progress)

        # Update status to processing
        gdrive_import.status = 'processing'
        gdrive_import.progress = 85
        gdrive_import.message = 'Download complete. Processing video...'
        gdrive_import.save()

        # Move file to the correct storage location
        # (adapt this to your storage backend — S3, R2, local, etc.)
        final_path = move_to_storage(temp_path, video)

        # Update video record with the file path
        video.video = final_path
        video.save()

        # Trigger existing HLS processing pipeline
        # (this is whatever you already use for chunked uploads)
        trigger_hls_processing(video)

        # Mark as complete
        gdrive_import.status = 'completed'
        gdrive_import.progress = 100
        gdrive_import.message = 'Import completed successfully!'
        gdrive_import.save()

    except Exception as e:
        gdrive_import.status = 'failed'
        gdrive_import.message = str(e)
        gdrive_import.error = str(e)
        gdrive_import.save()
        raise
```

### 4. View Implementations

```python
# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_from_google_drive(request):
    """Trigger a Google Drive import for a video."""
    video_id = request.data.get('videoId')
    google_drive_url = request.data.get('google_drive_url')

    if not video_id or not google_drive_url:
        return Response(
            {'success': False, 'message': 'videoId and google_drive_url are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate URL
    file_id = extract_google_drive_file_id(google_drive_url)
    if not file_id:
        return Response(
            {'success': False, 'message': 'Invalid Google Drive URL.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Video record not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Create or update import record
    gdrive_import, _ = GoogleDriveImport.objects.update_or_create(
        video=video,
        defaults={
            'google_drive_url': google_drive_url,
            'google_drive_file_id': file_id,
            'status': 'pending',
            'progress': 0,
            'message': 'Import queued...',
            'error': None,
        },
    )

    # Dispatch Celery task
    task = import_video_from_google_drive.delay(video_id, google_drive_url)
    gdrive_import.task_id = task.id
    gdrive_import.save(update_fields=['task_id'])

    return Response({
        'success': True,
        'message': 'Google Drive import started.',
        'data': {
            'video_id': video_id,
            'task_id': task.id,
            'status': 'pending',
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_drive_import_status(request):
    """Poll the status of a Google Drive import."""
    video_id = request.query_params.get('videoId')

    if not video_id:
        return Response(
            {'success': False, 'message': 'videoId is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        gdrive_import = GoogleDriveImport.objects.get(video_id=video_id)
    except GoogleDriveImport.DoesNotExist:
        return Response(
            {'success': False, 'message': 'No import task found for this video.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({
        'success': True,
        'data': {
            'video_id': int(video_id),
            'status': gdrive_import.status,
            'progress': gdrive_import.progress,
            'message': gdrive_import.message,
        },
    })
```

### 5. URL Configuration

```python
# urls.py (streaming app)
from django.urls import path
from . import views

urlpatterns = [
    # ... existing patterns ...
    path('import-from-google-drive/', views.import_from_google_drive, name='import-from-google-drive'),
    path('google-drive-import-status/', views.google_drive_import_status, name='google-drive-import-status'),
]
```

---

## Checklist

- [ ] Add `GoogleDriveImport` model (or fields to `Video` model)
- [ ] Run `python manage.py makemigrations` and `python manage.py migrate`
- [ ] Implement `extract_google_drive_file_id()` utility
- [ ] Implement `download_from_google_drive()` utility
- [ ] Create Celery task `import_video_from_google_drive`
- [ ] Create `import_from_google_drive` view (`POST /streaming/import-from-google-drive/`)
- [ ] Create `google_drive_import_status` view (`GET /streaming/google-drive-import-status/`)
- [ ] Register URL patterns in `streaming/urls.py`
- [ ] Ensure Celery worker is running and configured
- [ ] Test with a publicly shared Google Drive video file

---

## Important Notes

1. **File Sharing**: The Google Drive file **must** be shared as **"Anyone with the link"** for the direct download approach to work. If you need to support private files, use the Google Drive API with a service account.

2. **File Size Limits**: Google Drive's direct download method may show a virus scan confirmation page for files larger than ~100MB. The download function above handles this, but for very large files (>2GB), consider using the Google Drive API v3 with `alt=media`.

3. **Rate Limits**: Google Drive has download rate limits. If you expect high volume, implement rate limiting on your end and queue imports.

4. **Storage**: After downloading, the file should be moved to the same storage backend used by chunked uploads (e.g., R2, S3). Adapt the `move_to_storage()` function accordingly.

5. **Cleanup**: Always clean up temporary files after processing, even on failure.

6. **WebSocket Integration**: Optionally, you can push progress updates via the existing WebSocket infrastructure (`/socket/stream/progress/<video_id>/`) instead of polling. The frontend already has `useVideoProgress` hook that connects to this. If you choose this route, the polling endpoint becomes optional.

7. **Security**: Validate that the requesting user has permission to modify the video record. The current implementation assumes JWT-authenticated admin users.
