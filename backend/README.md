# Kovi API (backend)

NestJS 11 + Prisma 6 + PostgreSQL. Serves both the mobile app and the internal admin panel.

## Run locally

```bash
# 1. Postgres (any of these)
docker run -d --name kovi-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kovi -p 5432:5432 postgres:16-alpine
#    ...or `docker compose up` from the repo root (starts Postgres + API together)

# 2. Configure
cp .env.example .env          # defaults already point at the container above

# 3. Install, migrate, run
npm install
npx prisma migrate deploy
npm run start:dev             # http://localhost:3000  - Swagger UI at /docs
```

The first admin account is created on boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no admin exists.

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing (users get 30d tokens, admins 12h) |
| `PUBLIC_URL` | Public base URL of the API; used to build absolute image URLs |
| `CORS_ORIGINS` | Comma-separated browser origins (the admin panel) |
| `GOOGLE_CLIENT_IDS` | OAuth client IDs whose Google ID tokens are accepted |
| `APPLE_BUNDLE_ID` | iOS bundle id (audience of Apple identity tokens) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Bootstrap admin |
| `STORAGE_DRIVER` | `db` (files in Postgres, works on any host) or `local` (disk) |
| `MAIL_DRIVER` | `console` (logs reset codes) or `smtp` (+ `SMTP_*`) |

## API overview

All routes are under `/api` and documented in Swagger (`/docs`). Public files are served from `/files/:id`.

| Area | Routes |
|------|--------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/apple`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/refresh`, `GET /auth/me` |
| Profile | `GET/PATCH /users/me`, `POST /users/me/photo`, `GET /users/me/stats`, `GET /users/me/events` |
| Runs | `POST /runs`, `GET /runs`, `GET /runs/:id` |
| Events | `GET /events`, `GET /events/:id`, `POST /events/:id/join`, `GET /events/:id/participants`, `GET /events/:id/leaderboard` |
| Global leaderboard | `GET /leaderboard?category=FIVE_K|TEN_K|HALF_MARATHON&city=&state=&country=&scope=all|events` |
| Admin | `POST /admin/auth/login`, `GET /admin/stats`, `CRUD /admin/events`, `POST /admin/events/:id/banner`, `POST|DELETE /admin/events/:id/sponsor-logo`, `GET /admin/events/:id/participants|leaderboard`, `GET /admin/users` |

## How results are computed

A run is uploaded as a raw GPS trace (`route: [{lat, lng, t, alt?, seg?}]`). The server recomputes
distance (haversine), moving time (segments flagged `seg` after a pause are skipped) and the elapsed time
at which 5 km, 10 km and 21.0975 km were crossed. Leaderboards rank those split times, so:

- An event leaderboard shows each runner's fastest time over the **event's** distance category.
- The global leaderboard shows each runner's best split per category, filterable by the runner's
  city / state / country. Standalone (non-event) runs count by default; pass `scope=events` to restrict.
- A run shorter than the category distance never appears on that board.

## Demo data

```bash
npx prisma db seed     # adds a few sample events (idempotent)
```

## Tests

```bash
npm test
```

## Deploy

- **Docker**: `backend/Dockerfile` runs `prisma migrate deploy` then starts the API.
- **Render**: `render.yaml` at the repo root is a Blueprint (web service + free Postgres).
- Any other host works: set the env vars above and run `npm run build && npm run start:prod`.
