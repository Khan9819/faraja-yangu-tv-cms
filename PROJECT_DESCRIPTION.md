# 🎬 FarajaYangu — Streaming Platform

**FarajaYangu** is a modern, scalable video streaming platform designed to provide high-quality entertainment with the flexibility to integrate live streaming and dynamic advertisement placement.  
It features secure authentication, category-based content organization, ad scheduling, and real-time playback control — all powered by a Django REST API and a Flutter mobile app.

---

## 🧩 Project Overview

FarajaYangu allows users to:
- Watch on-demand videos from multiple categories and subcategories.
- Authenticate via **email/username + password** or **Google OAuth**.
- Enjoy a modern, elegant **dark orange** and **dark blue** themed UI.
- Experience video playback with **controlled ad insertions** powered by **Google AdMob**.
- Seamlessly transition to **live streaming** features in future updates.

---

## 🎨 Brand & Design

| Element | Description |
|----------|--------------|
| **Primary Color** | Dark Orange (`#FF7A00`) |
| **Secondary Color** | Dark Blue (`#0A1F44`) |
| **Theme Style** | Modern, minimal, dark-themed |
| **App Name** | FarajaYangu |

---

## 🧱 System Architecture

### 1. **Frontend (Flutter)**
- Cross-platform mobile app (Android & iOS).
- Uses `video_player` / `better_player` for video playback.
- Integrates **Google AdMob** for ad display.
- Fetches content and streams through **Django REST API**.

### 2. **Backend (Django REST Framework)**
- Handles all business logic, authentication, and content delivery.
- RESTful API architecture with:
  - **Public routes** (e.g. register, login, reset-password).
  - **Protected routes** requiring JWT-based authorization.
- Includes **token interceptor logic** to auto-refresh expired tokens.

### 3. **Storage & CDN**
- Object storage (e.g., AWS S3, DigitalOcean Spaces, Backblaze).
- Serves HLS segments (`.m3u8` and `.ts`) via CDN for high performance.
- No direct exposure of `.mp4` or raw files — all video streams are accessed via secure API endpoints.

### 4. **Future Live Streaming**
- Built to support RTMP → HLS conversion using `ffmpeg` and `nginx-rtmp`.
- Real-time event control and ad signals via WebSocket channels.

---

## 🔒 Authentication Flow

- **Login Methods**:
  - Email/Username + Password
  - Google OAuth
- **Security**:
  - JWT-based Bearer Tokens for all authenticated routes.
  - Access & Refresh tokens implemented with auto-refresh interceptor.
  - Secure password hashing (Django’s PBKDF2 or Argon2).
- **Token Flow**:
  - User logs in → receives access + refresh tokens.
  - Access token expires → interceptor requests a new one using refresh token.
  - Refresh token rotation for improved security.

---

## 🧠 Core Features

### 🎥 Video Management
- Videos categorized and subcategorized.
- Upload via Admin Dashboard.
- Each video supports:
  - Title, description, thumbnail, duration.
  - Category/subcategory.
  - View count, likes, and comments.
  - Ad schedule (for where to trigger Google Ads).

### 🗂 Categories
- Hierarchical structure:
  - **Category**
  - **Subcategory (Parent → Child Relationship)**

### 📢 Ads (Ad Interceptor System)
FarajaYangu uses an **ad signaling** approach instead of hardcoded ad video insertions.

- **Ad Intervals** are defined on the backend.
- Flutter app receives a list of timestamps and ad types to display.
- Ads are shown using Google AdMob SDK (interstitial, banner, rewarded).

**Example API Response:**
```json
{
  "video_id": 12,
  "title": "Life in Tanzania",
  "stream_url": "https://api.farajayangu.com/api/videos/12/stream/",
  "ad_intervals": [
    { "type": "interstitial", "timestamp": 60 },
    { "type": "banner", "timestamp": 180 },
    { "type": "rewarded", "timestamp": 600 }
  ]
}
