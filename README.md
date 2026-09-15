# Kovi Running App

Phase 1 MVP of a mobile-first running app: GPS run tracking, organised events, leaderboards and a
branded, Instagram-shareable result card, plus an internal admin panel for our own team.

[![Backend CI](https://github.com/Rudra-Kapoor/kovi-running-app/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Rudra-Kapoor/kovi-running-app/actions/workflows/backend-ci.yml)
[![Admin panel](https://github.com/Rudra-Kapoor/kovi-running-app/actions/workflows/admin-pages.yml/badge.svg)](https://github.com/Rudra-Kapoor/kovi-running-app/actions/workflows/admin-pages.yml)
[![Android APK](https://github.com/Rudra-Kapoor/kovi-running-app/actions/workflows/android-apk.yml/badge.svg)](https://github.com/Rudra-Kapoor/kovi-running-app/actions/workflows/android-apk.yml)

| | Where |
|--|--|
| **Admin panel (live)** | https://rudra-kapoor.github.io/kovi-running-app/ |
| **Android APK (latest build)** | https://github.com/Rudra-Kapoor/kovi-running-app/releases/tag/android-latest |
| **API** | Deploy in one click: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Rudra-Kapoor/kovi-running-app) |

## Monorepo

| Directory | What | Stack |
|-----------|------|-------|
| [`mobile/`](mobile/) | iOS + Android app | React Native (Expo SDK 57), TypeScript, Expo Router |
| [`backend/`](backend/) | REST API | Node.js 22, NestJS 11, Prisma 6, PostgreSQL 16 |
| [`admin/`](admin/) | Internal admin panel (team only) | React 19, Vite, TypeScript |
| [`docs/`](docs/) | Architecture, deployment, decisions | |

No AWS: files are stored in PostgreSQL (or local disk), the API runs in a plain Docker container
anywhere, the admin panel is static hosting, and the Android app is built by GitHub Actions.

## Quick start (local)

```bash
# API + Postgres
docker compose up --build          # API on http://localhost:3000, Swagger at /docs
#   admin login: admin@kovi.app / ChangeMe123!

# Admin panel
cd admin && npm install && npm run dev            # http://localhost:5173

# Mobile app (Expo Go)
cd mobile && npm install --legacy-peer-deps && npx expo start
```

## Phase 1 feature map

| PRD feature | Implementation |
|-------------|----------------|
| Authentication | `backend/src/auth` - email, Google (ID token), Apple (identity token), forgot/reset password by emailed code. `mobile/app/(auth)` |
| Onboarding | `mobile/app/onboarding.tsx` -> `PATCH /users/me` |
| Home screen | `mobile/app/(tabs)/index.tsx` |
| GPS run tracking (background) | `mobile/src/lib/runTracker.ts` (expo-location + task manager) and `mobile/app/run.tsx` |
| Post-run story card + Instagram | `mobile/src/components/StoryCard.tsx`, `mobile/src/lib/storyShare.ts`, `mobile/app/runs/[id].tsx` |
| Events (browse / details / join once) | `backend/src/events`, `mobile/app/(tabs)/events.tsx`, `mobile/app/events/[id].tsx` |
| Internal admin panel | `admin/` + `backend/src/admin` |
| Event participation with club tag | `POST /events/:id/join { club }` |
| Event Run Mode | `POST /runs { eventId }` -> leaderboard + story card |
| Event leaderboard | `GET /events/:id/leaderboard` |
| Global leaderboard (5K/10K/21K, city/state/country) | `GET /leaderboard` (`backend/src/leaderboard`) |
| Profile | `mobile/app/(tabs)/profile.tsx`, `GET /users/me/stats`, `/users/me/events`, `/runs` |

## Decisions on the PRD's open questions

| Question | Decision |
|----------|----------|
| Auth provider | Self-hosted JWT in the API. Google/Apple sign-in verify the providers' tokens server-side, so no Firebase/Supabase account is required and hosting is portable. |
| Admin panel framework / login | React + Vite static site; email/password admin accounts stored in the API (seeded from env). |
| Story card rendering / sharing | Rendered client-side (react-native-view-shot at 1080x1920). Android uses Instagram's Stories intent; iOS uses the native share sheet (Meta's iOS API needs native pasteboard code). |
| Admin "distance category" | Fixed to the leaderboard set: 5K / 10K / 21K. |
| Do standalone runs count on global boards? | Yes by default (`scope=all`); `scope=events` restricts to event runs. |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
