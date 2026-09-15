# Kovi Running App

Phase 1 MVP of a mobile-first running app: GPS run tracking, organised events, leaderboards and a branded, Instagram-shareable result card — plus an internal admin panel for our own team.

This is a monorepo:

| Directory | What | Stack |
|-----------|------|-------|
| `mobile/` | iOS + Android app | React Native (Expo), TypeScript |
| `backend/` | REST API | Node.js, NestJS, Prisma, PostgreSQL |
| `admin/` | Internal admin panel (team only) | React, Vite, TypeScript |

See each package's README for setup and the root [docs](docs/) for architecture and deployment.
