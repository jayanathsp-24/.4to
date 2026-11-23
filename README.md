# .4to MVP monorepo

Private-first photo sharing for trips and occasions.

## Layout

- `apps/mobile` — Expo/React Native app with expo-router and strict TypeScript
- `services/api` — FastAPI REST/WebSocket API, SQLAlchemy, Alembic and Celery worker
- `infra/docker-compose.yml` — Postgres, Redis, MinIO, API and worker
- `docs/decisions.md` — implementation choices
- `4to-logo.svg` — original brand asset; it is never modified or re-encoded

## Run API infrastructure

```bash
docker compose -f infra/docker-compose.yml up --build
```

The API is at `http://localhost:8000`, OpenAPI at `http://localhost:8000/docs`, health at `http://localhost:8000/health`, and MinIO at `http://localhost:9001`.

For local API development without Docker:

```bash
cd services/api
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
pytest -q
```

SQLite is the default fallback for local API development. Set `DATABASE_URL` for Postgres.

## Run mobile app

```bash
cd apps/mobile
npm install
npm run start
```

Set `EXPO_PUBLIC_API_URL` to your API origin (for example `http://192.168.1.20:8000`). The app includes demo data and loading/empty/error states.

## Run web app

```bash
cd apps/web
npm install
npm run dev
```

The web app is available at `http://localhost:5173`. Copy `.env.example` to `.env` and set `VITE_API_URL` to the API origin when live API calls are enabled:

```bash
cp .env.example .env
```

For production and type validation:

```bash
cd apps/web
npm run typecheck
npm run build
npm run preview
```

## Database migrations

```bash
cd services/api
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

The API creates tables for local startup; Alembic remains the required path for deployed schema changes.

## Photo Tree demo data

```bash
cd services/api
python scripts/seed_demo.py
```

This creates `demo@4to.app` with password `DemoPassword123`, 12 branches, and 20 joined Spaces. The mobile app renders the deterministic interactive tree with mock data when no API token is configured; the web app has the same tree/list fallback.

Each Space has a unique invite code and share link. In the app, open a Space and choose **Invite friends**. Friends can join with `POST /v1/spaces/join/{invite_code}` after signing in.

## Key invariants

- Originals are stored byte-for-byte in private S3-compatible object storage.
- Sharing creates a reference to the owner's photo, never a copied original.
- Only the owner sees private-tree rows unless a reference is shared into a joined Space.
- Tokens, passwords and signed photo URLs are never logged.
