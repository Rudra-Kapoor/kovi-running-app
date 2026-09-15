# Architecture

```
┌────────────────┐        HTTPS/JSON        ┌────────────────────┐        ┌──────────────┐
│  Mobile app    │ ───────────────────────▶ │  Kovi API (NestJS) │ ─────▶ │ PostgreSQL   │
│  Expo / RN     │   Bearer JWT (30 days)   │  /api/*  /files/*  │ Prisma │ (data+files) │
└────────────────┘                          └────────────────────┘        └──────────────┘
┌────────────────┐        HTTPS/JSON                 ▲
│  Admin panel   │ ──────────────────────────────────┘
│  React (static)│   Bearer JWT (12 h, role=admin)
└────────────────┘
```

## Backend

- **NestJS modules**: `auth`, `users`, `runs`, `events`, `leaderboard`, `admin`, `storage`, `mail`, `health`.
- **Two token roles** in one JWT secret: `role: user` (mobile) and `role: admin` (panel). Guards
  `JwtAuthGuard` / `AdminAuthGuard` enforce the role, so a user token can never hit admin routes.
- **Files**: `StorageService` has two drivers. `db` (default) keeps images in the `FileObject` table
  and serves them from `/files/:id` with long cache headers; `local` writes to disk. Images are
  resized and re-encoded to WebP on upload (banner 1600px, logo 800px, avatar 512px square).
- **Email**: `MailService` logs reset codes to the console by default; set `MAIL_DRIVER=smtp` to send.
- **Bootstrap admin**: `AdminService.onModuleInit` creates the first admin from env if none exist.

### Data model (Prisma)

- `User` - profile + auth (`provider`, `providerId`, optional `passwordHash`).
- `AdminUser` - separate table; no link to runner accounts.
- `Event` - name, description, banner, sponsor logo, `distanceCategory` (FIVE_K | TEN_K | HALF_MARATHON), date, location, soft-deleted with `deletedAt`.
- `EventParticipation` - `@@unique([userId, eventId])` is what enforces "can't join twice"; carries the club tag.
- `Run` - raw GPS `route` JSON plus server-computed `distanceMeters`, `durationSeconds`, `avgPaceSecPerKm` and `split5k/10k/21kSeconds`.
- `PasswordReset` - hashed 6-digit codes with expiry.
- `FileObject` - uploaded bytes (db storage driver).

### How runs are scored

The client uploads the raw trace; the server recomputes everything (`common/utils/geo.ts`):

1. Distance = sum of haversine distances between consecutive points.
2. Moving time = sum of time deltas, skipping intervals that start a new segment (`seg: true`, set after a pause).
3. Splits = moving time at the moment cumulative distance crosses 5 000 m / 10 000 m / 21 097.5 m, linearly interpolated within the crossing interval.

Leaderboards rank split times, never total run time:

- **Event leaderboard** = best split at the event's category per user among runs linked to the event. A run that never reached the distance is not ranked.
- **Global leaderboard** = best split per category per user across all runs (or event runs only), filtered by the runner's profile city/state/country. Implemented with one `DISTINCT ON` query.

This makes results comparable regardless of how far people ran past the line, and prevents clients from posting fake totals.

## Mobile

- **Expo Router** with three route groups gated by `Stack.Protected`: `(auth)` when signed out,
  `onboarding` until the profile is complete, `(tabs)` + detail screens afterwards.
- **Auth context** (`src/lib/auth.tsx`) holds the user; the token lives in SecureStore.
- **Run tracker** (`src/lib/runTracker.ts`) is a module-level store (`useSyncExternalStore`) fed by
  an `expo-task-manager` background location task, with a foreground `watchPositionAsync` fallback.
  The active run is mirrored to AsyncStorage so a killed app can offer to resume it.
- **Story card** is a normal React Native view rendered off-screen-sized (360x640) and captured at
  3x with `react-native-view-shot`. The route is drawn with `react-native-svg` from the GPS points,
  so no map tiles / API key are needed for the card.
- **Sponsor logo** appears only inside `StoryCard` - nowhere else in the app, per the PRD.

## Admin panel

Static React app. Talks to `/api/admin/*` with an admin JWT kept in `localStorage`. The API base URL
is set at build time (`VITE_API_URL`) and can be overridden on the login screen so the hosted panel
can point at any deployment.
