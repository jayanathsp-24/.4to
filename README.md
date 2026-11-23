<div align="center">
  <img src="4to-logo.svg" alt=".4to Logo" width="120" />
  <h1>.4to</h1>
  <p><strong>Private-first, full-fidelity shared photo platform. Every photo. Every friend. Zero compression.</strong></p>

  [![Web Build](https://img.shields.io/badge/Web-Vite%20%7C%20React%2019-lime?style=flat-square)](apps/web)
  [![Mobile App](https://img.shields.io/badge/Mobile-Expo%20%7C%20React%20Native-blue?style=flat-square)](apps/mobile)
  [![Backend API](https://img.shields.io/badge/API-FastAPI%20%7C%20Python-darkgreen?style=flat-square)](services/api)
  [![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-blueviolet?style=flat-square)](services/api)
  [![Storage](https://img.shields.io/badge/Storage-S3%20%2F%20MinIO%20(Original%20Quality)-orange?style=flat-square)](infra)
  [![Security](https://img.shields.io/badge/Security-2FA%20TOTP%20%7C%20Argon2-success?style=flat-square)](#security--privacy-architecture)
</div>

---

## 🌟 Overview

**.4to** is an uncompromising photo-sharing and memory-archiving platform built for trips, occasions, and friend groups. Unlike conventional social media and messaging platforms that compress, downsample, and strip metadata from images, **.4to** treats every captured frame as an archival artifact:

1. **Original Byte-for-Byte Preservation:** Photos are stored in their native sensor resolution and raw bit depth—never re-encoded, degraded, or resized.
2. **Evolutionary Cladogram Photo Tree:** Personal photo archives and shared spaces branch organically from a central chronological root seed, mapping personal growth and group experiences.
3. **Reference-Based Sharing:** When you contribute photos to a PhotoSpace, the system generates secure references to your private originals, preventing redundant storage costs while keeping you in full ownership.
4. **Privacy & Security by Default:** Built-in Two-Factor Authentication (TOTP 2FA), optional EXIF GPS location stripping when sharing external links, private tree visibility, and single-click full archive export (.ZIP).

---

## 📦 Monorepo Architecture

```
.4to/
├── apps/
│   ├── web/                     # React 19 + TypeScript + Vite SPA
│   │   ├── src/
│   │   │   ├── App.tsx          # Full client shell, Cladogram tree, 2FA & profile modals
│   │   │   ├── App.css          # Antigravity Dark & Electric Lime design system
│   │   │   ├── api.ts           # Type-safe API client with structured error mapping
│   │   │   └── data.ts          # High-fidelity mock and demo state fixtures
│   │   └── vite.config.ts
│   │
│   └── mobile/                  # Expo SDK 54 / React Native / TypeScript
│       ├── app/                 # File-based routing (expo-router)
│       │   ├── (auth)/          # Authentication & 2FA challenge screens
│       │   ├── (tabs)/          # Spaces, Cladogram Tree, Feed, Friends, Profile
│       │   └── spaces/[id].tsx  # PhotoSpace detail, live chat, and upload views
│       ├── features/tree/       # Cladogram geometry and branch layout computation
│       └── theme/               # Dark palette (#0B0B0B) and Electric Lime (#A6FF00)
│
├── services/
│   └── api/                     # High-performance FastAPI backend
│       ├── app/
│       │   ├── core/            # Config, database engine, JWT, and Argon2 security
│       │   ├── models/          # SQLAlchemy ORM models (Users, Spaces, Photos, Trees)
│       │   ├── schemas/         # Pydantic v2 validation contracts
│       │   ├── workers/         # Background tasks (EXIF extraction, ZIP exports)
│       │   └── main.py          # REST & WebSocket endpoints with rate limiting
│       ├── migrations/          # Alembic database migrations
│       └── tests/               # Pytest suite with WebSocket and rate-limit test coverage
│
├── infra/
│   └── docker-compose.yml       # PostgreSQL, Redis, MinIO S3 object store, API, worker
├── docs/                        # Architecture Decision Records (ADRs)
└── 4to-logo.svg                 # Canonical vector brand asset
```

---

## ✨ Key Features

### 🌳 1. Evolutionary Cladogram Photo Tree
- Visualizes personal history as an evolutionary tree where branches derive from a central trunk seed (`@user's Private Photo Vault`).
- Each derived branch maps exactly to a dedicated **PhotoSpace**, complete with date range, contribution status, member counts, and unread activity tags.
- Interactive view modes: Switch smoothly between **Graphical Cladogram** (SVG branch curve rendering with glowing junction nodes) and **Structured List** view.
- Deep bi-directional navigation: Click any branch to enter the PhotoSpace, and click back to return directly to your evolutionary tree position without losing context.

### 📸 2. PhotoSpaces (Collaborative Shared Albums)
- Multi-member shared spaces with dedicated contribution windows and start/end dates.
- Member progress tracker: Visual indicator highlighting how many members have uploaded their moments.
- Integrated high-speed photo browser, full-screen lightbox, and multi-contributor grid.
- Unique invite codes (`POST /v1/spaces/join/{invite_code}`) and shareable handles (e.g. `@coast_weekend`).

### 🔐 3. Two-Factor Authentication (2FA / TOTP)
- **3-Step Authenticator App Setup:** Compatible with Google Authenticator, 1Password, and Authy.
- **Stylized SVG QR Code Generator:** Crisp, high-contrast QR display alongside a manual setup secret key.
- **Emergency Recovery Codes:** Generates 6 single-use emergency backup recovery codes with one-click clipboard copying.
- **Sign-In Challenge:** Login screens on Web and Mobile enforce 6-digit TOTP verification (or single-use backup recovery code entry) when 2FA is active.

### 🛡️ 4. Privacy & Security Controls
- **EXIF GPS Stripping on Share:** Automatically removes latitude, longitude, and altitude coordinates when creating external links or downloading shares.
- **Private Tree Vault:** Evolutionary tree nodes remain restricted strictly to invited collaborators.
- **Search Discoverability Toggle:** Option to make profile discoverable by `@username` and email or remain fully unlisted.
- **Data Portability (Zero Lock-in):** One-click button to export all stored uncompressed photos and metadata as a byte-for-byte `.zip` archive.
- **WebSocket IDOR Protection:** Real-time chat subscriptions strictly enforce space membership authorization.
- **Sliding-Window Rate Limiting:** Brute-force protection on authentication and invite endpoints.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v20+ and `npm`
- **Python:** v3.11+ (Python 3.12 or 3.14 recommended)
- **Docker & Docker Compose** (for full infrastructure deployment)

---

### Option A: Run Full Stack with Docker Compose

Spin up PostgreSQL, MinIO S3, Redis, the FastAPI backend, and the background worker in one command:

```bash
docker compose -f infra/docker-compose.yml up --build
```

- **API Server:** [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **MinIO Console (S3 Storage):** [http://localhost:9001](http://localhost:9001) (`user: 4to`, `password: 4to-secret`)

---

### Option B: Local Development Setup

#### 1. Backend API (`services/api`)

```bash
cd services/api

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (SQLite is used by default for local development)
alembic upgrade head

# Seed initial demo account and spaces
python scripts/seed_demo.py

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run backend unit tests:
```bash
python3 -m pytest
```

#### 2. Web Application (`apps/web`)

```bash
cd apps/web

# Install packages
npm install

# Start development server
npm run dev -- --host 0.0.0.0 --port 5173
```

- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Demo account: `demo@4to.app` / `DemoPassword123` (or click **Continue with Demo**).

Validate production build:
```bash
npm run build
```

#### 3. Mobile Application (`apps/mobile`)

```bash
cd apps/mobile

# Install packages
npm install

# Start Expo development server
npx expo start
```

Press `w` to open in web browser, or scan the QR code with the **Expo Go** app on iOS / Android.

Typecheck mobile app:
```bash
npx tsc --noEmit
```

---

## 📡 API Reference Overview

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/v1/auth/register` | Create account (rate-limited) | No |
| `POST` | `/v1/auth/login` | Sign in & receive access/refresh tokens | No |
| `POST` | `/v1/auth/refresh` | Refresh expired access token | No |
| `GET` | `/v1/me` | Current user profile, storage usage, and tier | Yes |
| `PATCH` | `/v1/me` | Update display name and avatar | Yes |
| `GET` | `/v1/tree/overview` | Fetch personal evolutionary Photo Tree & branches | Yes |
| `POST` | `/v1/spaces` | Create new PhotoSpace and derived branch | Yes |
| `GET` | `/v1/spaces` | List joined PhotoSpaces | Yes |
| `POST` | `/v1/spaces/join/{code}` | Join PhotoSpace via 8-character invite code | Yes |
| `POST` | `/v1/uploads/init` | Initiate presigned S3 upload for uncompressed photo | Yes |
| `POST` | `/v1/uploads/complete` | Complete upload and update storage quota | Yes |
| `GET` | `/v1/spaces/{id}/photos` | List photos shared to a space (with EXIF stripping) | Yes |
| `GET` | `/v1/spaces/{id}/messages` | Get space chat history | Yes |
| `WS` | `/v1/ws?token={jwt}` | Real-time WebSocket channel for space chat and events | Yes |

---

## 🎨 Design System

.4to employs an **Antigravity Dark** aesthetic:
- **Background Primary:** `#0B0B0B` (Deep Carbon)
- **Surface Elevation 1:** `#151515`
- **Surface Elevation 2:** `#1E1E1E`
- **Border / Dividers:** `#2A2A2A`
- **Accent Brand:** `#A6FF00` (Electric Lime)
- **Accent Glow:** `rgba(166, 255, 0, 0.18)`
- **Text on Accent:** Strict high-contrast `#0B0B0B`
- **Typography:** Modern geometric grotesque typography with tabular figures for dates, branch milestones, and storage counters.

---

## 🛡️ Security & Privacy Architecture

- **Argon2 Password Hashing:** Uses `argon2-cffi` with state-of-the-art memory-hard salt and hashing.
- **Stateless Bearer JWTs:** Short-lived access tokens (15 mins) and long-lived refresh tokens (30 days).
- **WebSocket IDOR Protection:** Subscribing to space message rooms requires verified space membership.
- **SQL Wildcard Sanitization:** User search inputs escape `%`, `_`, and `\` characters to prevent SQL injection or query exhaustion.
- **Production Guard:** Server startup verifies strong `JWT_SECRET` keys and non-default credentials in production environments.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
