# .4to — Product & Build Specification

> A private-first photo sharing app for trips and occasions. Keep every photo at full quality, share only what you choose, and merge everyone's photos into one trip album.

This document is written so an AI coding assistant (Claude Code, Cursor, etc.) can build the app from it. Read **Section 17 (Rules for the AI)** first.

---

## 1. Brand

| Item | Value |
|---|---|
| App name | `.4to` (pronounced "dot four-to") |
| Wordmark | `.` white, `4` **lime green**, `to` white |
| Tagline options | "Every photo. Every friend. Full quality." / "Your trip, in one place." |
| Logo file | `4to-logo.svg` (included alongside this file) |

### Logo rules
- Always written lowercase as `.4to`.
- The `4` is always lime `#A6FF00`. The `.`, `t`, `o` are always white `#FFFFFF` on dark backgrounds.
- On a light background (rare), use black `#0B0B0B` for `.`, `t`, `o` and keep the `4` lime with a thin black outline for contrast.
- App icon: black rounded square with a large lime `4` centered (dot optional).
- Minimum clear space around the wordmark: the width of the letter `o`.

### Inline logo (SVG)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 200">
  <rect width="480" height="200" rx="28" fill="#0B0B0B"/>
  <text x="240" y="132" text-anchor="middle"
        font-family="'Space Grotesk','Poppins','Inter',Arial,sans-serif"
        font-size="108" font-weight="700" letter-spacing="-2">
    <tspan fill="#FFFFFF">.</tspan><tspan fill="#A6FF00">4</tspan><tspan fill="#FFFFFF">to</tspan>
  </text>
</svg>
```

---

## 2. Problem

- After a group trip, photos are scattered across everyone's phones.
- Many photos are taken on someone else's phone, so you don't have them.
- WhatsApp and similar apps compress photos, so quality drops.
- After the trip, one friend gets asked over and over to share the photos.
- Existing apps solve parts of this (shared albums) but are not private-first and don't combine a personal photo vault, trip spaces and social features.

## 3. Vision

`.4to` gives each person a **private cloud photo tree** at original quality. From it they share chosen photos into **Spaces** (one per trip or occasion) and optionally to their **personal feed**. Everyone's contributions merge into one chronological trip album.

## 4. Target users

- Friend groups and families who travel together (primary).
- Event groups (weddings, graduations, trips, hikes).
- Android and iPhone users mixed in the same group.

---

## 5. Core concepts (glossary)

| Term | Meaning |
|---|---|
| **User** | A person with an account and a unique `@username`. |
| **Friend** | A mutual connection between two users, made by username search + accept. |
| **Photo Tree** | A user's private cloud storage of original photos, organized in folders ("branches") by trip/occasion/date. Visible only to the owner. |
| **Space** | A shared area for one trip or occasion with members, a shared photo feed, and a chat panel. |
| **Member** | A user inside a Space. Either a **friend** of the creator or an **independent member** (someone not in the creator's friend list, who only has access to that Space). |
| **Share to Space** | Owner selects photos from their Photo Tree and adds them to a Space. Original stays in the owner's tree; the Space holds a reference. |
| **Feed** | A user's personal posts (photos they choose to post for their friends). |
| **Chat panel** | Side panel inside a Space for group messages. |

---

## 6. Feature list

### MVP (build first)
1. Sign up / log in, unique username, profile (avatar, display name).
2. Friends: search by username, send/accept/decline/remove.
3. Photo Tree: upload originals (multi-select, background upload, resume), folders, view, delete, download original.
4. Spaces: create (name, cover, date range), invite friends, invite independent members by username, roles.
5. Share to Space: bulk multi-select from Photo Tree, with suggestions by Space date range.
6. Space feed: merged chronological grid of everyone's shared photos, viewer with swipe, download original, download all.
7. Space chat panel: text messages, real-time, unread count.
8. Contribution status: "4 of 6 members have added photos" and automated reminders after the trip.
9. Push notifications (invites, new photos, chat, reminders).

### Phase 2
- Personal feed with posts, likes, comments, friend-only visibility.
- Tag members in photos (with untag).
- Reactions and comments on Space photos.
- Auto-generated trip recap (highlights/slideshow).
- Location/map view of a Space.
- Photo captions, favorites, search in tree.
- Storage plans and payments.

### Phase 3
- Face grouping (opt-in, on-device where possible).
- Print photo books.
- Web viewer for people without the app (read-only link, optional).
- Video support.

### Explicitly out of scope for MVP
Public discovery feed, ads, stories, video editing, AI generation.

---

## 7. User flows

### 7.1 Onboarding
1. Open app → splash with `.4to` logo.
2. Sign up (email + password, or Google/Apple sign-in) → choose unique `@username` → optional avatar.
3. Permission prompts: photo library, notifications (explain why before asking).
4. Empty state: "Add your first photos" and "Find friends".

### 7.2 Add friends
1. Friends tab → search `@username` → Send request.
2. Recipient sees request → Accept / Decline.
3. Friends list shows avatar, name, username.

### 7.3 Create a Space
1. Spaces tab → "+" → name, cover photo, start/end date, description (optional).
2. Add members: pick friends, or search any `@username` to add as independent member.
3. Invited users receive a notification and must accept to join.
4. Creator is **Owner**; can promote Admins.

### 7.4 Upload to Photo Tree
1. Tree tab → "+" → multi-select from device library.
2. Uploads run in background, resume on network loss, show progress.
3. Photos land at the root or in a chosen branch (folder).
4. Dedupe by content hash so the same photo isn't stored twice.

### 7.5 Share to a Space (core flow)
1. Open Space → "Add your photos".
2. App suggests photos from the user's Photo Tree whose `taken_at` falls within the Space date range (plus a padding of ±1 day); user can also browse the whole tree.
3. Multi-select → Confirm → photos appear in the Space feed.
4. User can remove their own shared photos from the Space at any time.

### 7.6 After-trip reminders
1. When the Space end date passes, schedule reminders to members who have shared 0 photos (day +2, +5, +10; then stop).
2. Space header shows progress: "4/6 have added photos".
3. Any member can tap "Remind" next to a member who hasn't shared (rate-limited: once per 48 hours per target).

### 7.7 Chat
1. Space → chat panel (side panel on tablet/web, slide-over/tab on phone).
2. Messages: text, photo reference from the Space, reply, delete own message.
3. Real-time via WebSocket; offline messages queue and send on reconnect.

### 7.8 Download
- Single photo: original file.
- "Download all": zip of all originals in the Space (generated server-side, link emailed/notified when ready).

---

## 8. Screens

| # | Screen | Key elements |
|---|---|---|
| 1 | Splash | Logo on black |
| 2 | Auth (sign up / log in) | Email/password, social sign-in |
| 3 | Username setup | Live availability check |
| 4 | Home / Spaces list | Space cards with cover, member avatars, progress |
| 5 | Create Space | Name, dates, cover, members |
| 6 | Space detail | Header (progress), tabs: Photos, Members, Chat |
| 7 | Space photo grid | Chronological merged grid, filter by member |
| 8 | Photo viewer | Swipe, download original, who shared it |
| 9 | Add to Space (picker) | Suggested by date, select all, confirm |
| 10 | Photo Tree | Folders, grid, upload FAB, storage meter |
| 11 | Friends | List, requests, search |
| 12 | Feed (Phase 2) | Posts, likes, comments |
| 13 | Profile / Settings | Avatar, username, storage, privacy, notifications, delete account |
| 14 | Notifications | Invites, reminders, activity |

Navigation (bottom tabs): **Spaces · Tree · Feed · Friends · Profile**. Chat lives inside each Space.

---

## 9. Design system

### Colors
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0B0B0B` | App background (dark theme default) |
| `--surface` | `#151515` | Cards, sheets |
| `--surface-2` | `#1E1E1E` | Inputs, chips |
| `--border` | `#2A2A2A` | Dividers |
| `--lime` | `#A6FF00` | Primary accent, buttons, active states, the "4" |
| `--lime-dim` | `#7BC400` | Pressed state |
| `--lime-glow` | `rgba(166,255,0,0.15)` | Highlights, selected backgrounds |
| `--text` | `#FFFFFF` | Primary text |
| `--text-muted` | `#A1A1AA` | Secondary text |
| `--danger` | `#FF4D4D` | Destructive actions |

Text on lime buttons is **black** `#0B0B0B` (never white; contrast).

### Light theme (optional)
Background `#FFFFFF`, surface `#F5F5F5`, text `#0B0B0B`, lime accent stays `#A6FF00` but is used as fill with black text, not as text color.

### Typography
- Headings: **Space Grotesk** (600–700).
- Body/UI: **Inter** (400–600).
- Sizes: 12 / 14 / 16 / 20 / 24 / 32.

### Components
- Primary button: lime fill, black text, 12px radius, 48px height.
- Secondary button: transparent, 1px lime border, lime text.
- Cards: `--surface`, 16px radius, no heavy shadows.
- Selected photo: lime border + check badge.
- Progress bars: lime on `--surface-2`.
- Avatars: circular, lime ring for the current user.
- Motion: 150–250ms ease-out; a short lime "merge" animation when the Space album completes.

---

## 10. Recommended tech stack

Chosen to be beginner-friendly to build with AI, cheap to run, and solid for large files.

| Layer | Choice | Notes |
|---|---|---|
| Mobile app | **React Native + Expo** (TypeScript) | One codebase for Android + iOS. Alternative: Flutter. |
| Backend API | **FastAPI** (Python 3.12) | Async, auto-generated OpenAPI docs. Alternative: NestJS. |
| Database | **PostgreSQL 16** | Relational data fits friends/spaces/members well. |
| Cache / queues | **Redis** | Rate limits, job queue, WebSocket pub/sub. |
| Background jobs | **Celery** or **RQ** | Thumbnails, zip generation, reminders. |
| Object storage | **S3-compatible** (Cloudflare R2, Backblaze B2, or AWS S3) | Originals stored untouched. R2 has no egress fees. |
| Uploads | **Presigned multipart uploads** direct from phone to storage | Backend never proxies big files. |
| Real-time chat | **WebSockets** (FastAPI) + Redis pub/sub | Or a managed service later. |
| Push | **Firebase Cloud Messaging** (Expo Notifications) | Android + iOS. |
| Auth | JWT access + refresh tokens, Argon2 password hashing; optional Google/Apple sign-in | |
| Image processing | `Pillow` / `pyvips`, EXIF via `exifread` | Thumbnails (320, 1080 px) and metadata. |
| Dev environment | **Docker Compose** | Postgres, Redis, MinIO (local S3), API, worker. |
| CI/CD | GitHub Actions | Lint, test, build image, deploy. |
| Hosting | A VPS or container host (Fly.io, Railway, Hetzner) + managed Postgres | Start small. |
| Monitoring | Sentry + basic uptime check | |

### Key technical rule
**Originals are never re-encoded.** Store the uploaded file byte-for-byte. Only derived thumbnails/previews are compressed. This is the whole point of the product.

---

## 11. Architecture

```
┌────────────┐   HTTPS/JSON    ┌──────────────┐        ┌────────────┐
│ Mobile app │ ──────────────► │  FastAPI     │ ─────► │ PostgreSQL │
│ (Expo RN)  │ ◄────────────── │  REST + WS   │        └────────────┘
└─────┬──────┘                 └──────┬───────┘
      │ presigned PUT                 │ jobs            ┌────────────┐
      │ (multipart)                   ▼                 │   Redis    │
      │                        ┌──────────────┐ ◄─────► │ queue/pubsub│
      ▼                        │  Workers     │         └────────────┘
┌──────────────┐  events       │ thumbs, zip, │
│ Object store │ ─────────────►│ reminders    │
│  (S3 / R2)   │               └──────────────┘
└──────────────┘
```

Upload flow:
1. App asks API: `POST /uploads/init` with file metadata (name, size, hash, mime, taken_at).
2. API returns presigned multipart URLs (or "already exists" if hash matches).
3. App uploads parts directly to storage, then calls `POST /uploads/complete`.
4. API creates the `photos` row; a worker generates thumbnails and extracts EXIF.

---

## 12. Data model (PostgreSQL)

```sql
users(
  id uuid pk, email text unique, password_hash text,
  username citext unique, display_name text, avatar_url text,
  storage_used_bytes bigint default 0, storage_limit_bytes bigint,
  created_at timestamptz, deleted_at timestamptz
)

friendships(
  id uuid pk, requester_id uuid fk users, addressee_id uuid fk users,
  status text check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz, unique(requester_id, addressee_id)
)

tree_folders(                          -- branches of the photo tree
  id uuid pk, owner_id uuid fk users, parent_id uuid fk tree_folders null,
  name text, created_at timestamptz
)

photos(                                -- one row per original in a private tree
  id uuid pk, owner_id uuid fk users, folder_id uuid fk tree_folders null,
  storage_key text, thumb_key text, preview_key text,
  content_hash text, mime_type text, size_bytes bigint,
  width int, height int, taken_at timestamptz, lat double precision, lng double precision,
  created_at timestamptz, deleted_at timestamptz,
  unique(owner_id, content_hash)
)

spaces(
  id uuid pk, owner_id uuid fk users, name text, description text,
  cover_photo_id uuid null, start_date date, end_date date,
  status text check (status in ('active','closed','archived')) default 'active',
  created_at timestamptz
)

space_members(
  space_id uuid fk, user_id uuid fk,
  role text check (role in ('owner','admin','member')),
  membership_type text check (membership_type in ('friend','independent')),
  status text check (status in ('invited','joined','left','removed')),
  joined_at timestamptz, last_read_message_id uuid null,
  primary key(space_id, user_id)
)

space_photos(                          -- reference, not a copy
  id uuid pk, space_id uuid fk, photo_id uuid fk, shared_by uuid fk users,
  shared_at timestamptz, removed_at timestamptz null,
  unique(space_id, photo_id)
)

messages(
  id uuid pk, space_id uuid fk, sender_id uuid fk users,
  body text, reply_to uuid null, photo_ref uuid null,
  created_at timestamptz, deleted_at timestamptz null
)

feed_posts(                            -- Phase 2
  id uuid pk, author_id uuid fk users, caption text,
  visibility text check (visibility in ('friends','only_me')) default 'friends',
  created_at timestamptz
)
feed_post_photos(post_id uuid fk, photo_id uuid fk, position int)

reactions(id uuid pk, user_id uuid, target_type text, target_id uuid, kind text)  -- Phase 2
comments(id uuid pk, user_id uuid, target_type text, target_id uuid, body text, created_at timestamptz) -- Phase 2

reminders(
  id uuid pk, space_id uuid, user_id uuid, kind text,
  scheduled_for timestamptz, sent_at timestamptz null
)

notifications(id uuid pk, user_id uuid, type text, payload jsonb, read_at timestamptz null, created_at timestamptz)
push_tokens(id uuid pk, user_id uuid, token text, platform text, created_at timestamptz)
```

Indexes: `photos(owner_id, taken_at)`, `space_photos(space_id, shared_at)`, `messages(space_id, created_at)`, `friendships(addressee_id, status)`.

### Important design decision
Sharing to a Space stores a **reference** (`space_photos`). The original stays in the owner's tree. If the owner deletes the photo from their tree, it disappears from Spaces too. Show a warning before deleting a photo that is shared. (Alternative: "copy on share" so the Space keeps it; costs more storage. Decide before building.)

---

## 13. API outline (REST, prefix `/v1`)

**Auth**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /users/check-username?u=`

**Users & friends**
- `GET /me`, `PATCH /me`
- `GET /users/search?q=`
- `GET /friends`, `POST /friends/requests`, `POST /friends/requests/{id}/accept`, `POST /friends/requests/{id}/decline`, `DELETE /friends/{userId}`

**Photo Tree**
- `POST /uploads/init`, `POST /uploads/complete`, `POST /uploads/abort`
- `GET /tree/photos?folder=&cursor=`, `GET /tree/photos/suggest?from=&to=`
- `DELETE /tree/photos/{id}`, `GET /tree/photos/{id}/download`
- `POST /tree/folders`, `PATCH /tree/folders/{id}`, `DELETE /tree/folders/{id}`

**Spaces**
- `POST /spaces`, `GET /spaces`, `GET /spaces/{id}`, `PATCH /spaces/{id}`, `DELETE /spaces/{id}`
- `POST /spaces/{id}/members` (invite by username), `POST /spaces/{id}/join`, `POST /spaces/{id}/leave`, `DELETE /spaces/{id}/members/{userId}`
- `POST /spaces/{id}/photos` (body: array of photo ids), `DELETE /spaces/{id}/photos/{photoId}`
- `GET /spaces/{id}/photos?cursor=&member=`
- `GET /spaces/{id}/progress`
- `POST /spaces/{id}/remind/{userId}`
- `POST /spaces/{id}/export` (zip job) → `GET /exports/{id}`

**Chat**
- `GET /spaces/{id}/messages?cursor=`, `POST /spaces/{id}/messages`, `DELETE /messages/{id}`
- `WS /ws` (authenticated; subscribes to the user's Space channels)

**Feed (Phase 2)**: `POST /posts`, `GET /feed`, `POST /posts/{id}/react`, `POST /posts/{id}/comments`

**Notifications**: `GET /notifications`, `POST /push-tokens`

All list endpoints use cursor pagination. Return signed, short-lived URLs for image access.

---

## 14. Permissions & privacy rules

- Photo Tree content is visible **only** to its owner. No exceptions, no admin browsing.
- A photo in a Space is visible only to joined members of that Space.
- Independent members see only that Space, never the creator's friends list or other Spaces.
- Only the sharer can remove their photo from a Space; Owner/Admin can also remove any photo.
- Only Owner/Admin can invite or remove members; only Owner can delete the Space.
- Blocking a user hides you from search and prevents new invites.
- No scanning of photos for ads or AI training. State this in the privacy policy.
- Account deletion removes the tree and all references within 30 days.
- Strip nothing from originals, but **offer a "remove location data on share" toggle**.
- Rate limit: auth endpoints, friend requests, reminders, invites.
- Presigned URLs expire in ≤15 minutes; storage bucket is private.

---

## 15. Non-functional requirements

- **Upload reliability:** resumable multipart upload, retries with backoff, background upload on mobile.
- **Performance:** Space grid first paint < 1.5 s on mid-range Android using thumbnails; infinite scroll with cursor pagination.
- **Scale target (v1):** 10k users, 5M photos.
- **Storage:** free tier (e.g., 5 GB per user) then paid plans.
- **Offline:** Tree and Spaces cached for viewing; uploads queue offline.
- **Accessibility:** support dynamic font size; alt text for avatars; contrast checked (lime on black passes, lime text on white does not).
- **Localization-ready:** all strings in i18n files (English first; Sinhala/Tamil later).
- **Testing:** unit tests for services, API tests, a few end-to-end flows (upload → share → view).
- **Legal:** Terms, Privacy Policy, data export and deletion.

---

## 16. Project structure

```
4to/
├─ apps/
│  └─ mobile/                # Expo React Native (TypeScript)
│     ├─ app/                # expo-router screens
│     ├─ components/
│     ├─ theme/              # colors.ts, typography.ts (tokens from Section 9)
│     ├─ api/                # typed API client (generated from OpenAPI)
│     ├─ store/              # Zustand or Redux Toolkit
│     └─ assets/             # logo, icons, fonts
├─ services/
│  └─ api/                   # FastAPI
│     ├─ app/
│     │  ├─ routers/         # auth, users, friends, tree, spaces, chat, feed
│     │  ├─ models/          # SQLAlchemy models
│     │  ├─ schemas/         # Pydantic
│     │  ├─ services/        # business logic
│     │  ├─ workers/         # Celery tasks
│     │  └─ core/            # config, security, db
│     ├─ migrations/         # Alembic
│     └─ tests/
├─ infra/
│  ├─ docker-compose.yml     # api, worker, postgres, redis, minio
│  └─ github-actions/
├─ docs/
│  └─ 4to-app-spec.md        # this file
└─ README.md
```

---

## 17. Rules for the AI building this

1. Follow this spec; if something is unclear, make the simplest choice and note it in `docs/decisions.md`.
2. Build **MVP only** (Section 6) until told otherwise.
3. Never re-encode or resize originals. Only generate separate thumbnails.
4. Use TypeScript strict mode on the app and type hints + Pydantic on the API.
5. Use the color and typography tokens from Section 9; do not hard-code colors in components.
6. Every endpoint needs auth, input validation, and a test.
7. Never log passwords, tokens, or photo URLs.
8. Use environment variables for all secrets; provide `.env.example`.
9. Write database changes as Alembic migrations, never edit tables by hand.
10. Keep commits small and each step runnable (`docker compose up` must work).
11. Don't add libraries that aren't needed; explain any new dependency.

---

## 18. Build plan (step-by-step prompts)

Give these to the AI one at a time, verifying each before moving on.

**Step 1: Project setup**
> Create the monorepo structure from Section 16. Add Docker Compose with Postgres, Redis, MinIO, and the FastAPI service. Add a health endpoint and confirm `docker compose up` works.

**Step 2: Auth & users**
> Implement register, login, refresh with JWT, Argon2 hashing, unique usernames with availability check, and `GET/PATCH /me`. Add Alembic migrations and tests.

**Step 3: Friends**
> Implement user search by username and the friendship request/accept/decline/remove endpoints with the rules in Section 14. Add tests.

**Step 4: Photo Tree + uploads**
> Implement presigned multipart uploads against MinIO/S3, content-hash dedupe, the `photos` and `tree_folders` tables, and a worker that makes 320px and 1080px thumbnails and extracts EXIF (`taken_at`, GPS). Originals must be stored unmodified.

**Step 5: Spaces**
> Implement Spaces, members (friend and independent), invitations, roles, and the share/unshare photo endpoints that create references. Implement the date-range suggestion endpoint and the progress endpoint.

**Step 6: Chat & notifications**
> Implement messages with REST history and a WebSocket channel per Space using Redis pub/sub. Add push token storage and FCM notifications for invites, new photos, chat, and reminders.

**Step 7: Reminders & export**
> Implement scheduled reminders (day +2, +5, +10 after Space end date for members with 0 shared photos), the rate-limited manual remind, and zip export of all originals in a Space as a background job.

**Step 8: Mobile app**
> Create the Expo app with the theme from Section 9. Build screens in this order: auth → Photo Tree + upload → Spaces list/create → Space detail (photos, members, chat) → Add-to-Space picker → Friends → Profile. Use the typed API client and handle loading, empty, and error states.

**Step 9: Polish & release**
> Add background upload, offline caching, app icon and splash from the brand rules, Sentry, privacy policy and terms screens, and prepare Android (Play Store) and iOS (TestFlight) builds.

**Step 10 (later): Phase 2**
> Add personal feed, reactions, comments, tagging with untag, map view, and the auto-generated recap.

---

## 19. Acceptance criteria (MVP done when…)

- [ ] A new user can sign up, pick a username, and add a friend.
- [ ] A user can upload 500+ photos; interrupted uploads resume; originals are byte-identical when downloaded.
- [ ] A user can create a Space, invite a friend and an independent member, and both can join.
- [ ] Members can bulk-share photos from their private tree; the Space shows a merged, chronological grid.
- [ ] Photos in a private tree are never visible to anyone else unless shared.
- [ ] Chat messages arrive in real time and unread counts work.
- [ ] After a Space's end date, members who haven't shared receive reminders; the progress indicator is accurate.
- [ ] "Download all" produces a zip of original-quality files.
- [ ] The app uses the lime/white/black theme and the `.4to` wordmark as specified.

---

## 20. Open decisions (choose before or during build)

1. Reference vs copy when sharing to a Space (Section 12).
2. Free storage amount and paid plan pricing.
3. Sign-in methods at launch (email only vs Google/Apple).
4. Whether Space chat supports photo replies in MVP.
5. Self-hosted storage (MinIO on a VPS) vs managed (R2/S3) for production.
6. Launch region and languages.

---

## 21. Risks to keep in mind

- **Adoption:** a whole group must install the app; the independent-member option and low-friction invites reduce this. Consider a read-only web link in Phase 3.
- **Storage cost:** originals are large; set quotas and monitor cost per user.
- **Scope creep:** the social feed is Phase 2 on purpose; ship Spaces first and learn from real trips.
- **Competition:** shared-album apps already exist; the private Photo Tree + post-trip merge + contribution reminders are the differentiators.
