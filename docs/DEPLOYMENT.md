# Deployment

Everything below avoids AWS. The three deployables are independent.

## 1. API + PostgreSQL

The API is a Docker image (`backend/Dockerfile`) that runs `prisma migrate deploy` on start, so any
container host with a Postgres add-on works. `STORAGE_DRIVER=db` keeps uploads in Postgres, so no
object storage or persistent disk is needed.

### Render (one click, free tier)

1. Click **Deploy to Render** in the root README (or go to https://render.com/deploy?repo=https://github.com/Rudra-Kapoor/kovi-running-app) and sign in with GitHub.
2. Render reads `render.yaml`: a Docker web service `kovi-api` + a free Postgres `kovi-db`. `JWT_SECRET` and `ADMIN_PASSWORD` are generated; copy the admin password from the service's Environment tab.
3. After the first deploy the API is at `https://kovi-api.onrender.com` (`/health`, `/docs`). If Render gives the service a different name, update `PUBLIC_URL` in its environment.

Free instances sleep after inactivity; the first request may take ~30 s.

### Anywhere else (Railway, Fly.io, Koyeb, a VPS...)

Build the image from `backend/` and set the environment variables listed in `backend/README.md`
(`DATABASE_URL`, `JWT_SECRET`, `PUBLIC_URL`, `CORS_ORIGINS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
`docker-compose.yml` at the repo root is a working reference stack.

## 2. Admin panel -> GitHub Pages (already live)

`.github/workflows/admin-pages.yml` builds `admin/` and deploys it to
https://rudra-kapoor.github.io/kovi-running-app/ on every push to `main`.

Point it at your API by setting a repository **variable** `API_URL` (Settings > Secrets and
variables > Actions > Variables) and re-running the workflow. Until then it defaults to
`https://kovi-api.onrender.com`, and the login screen's "Advanced" field can override the URL per browser.

Make sure the API's `CORS_ORIGINS` includes `https://rudra-kapoor.github.io`.

## 3. Mobile app

### Android APK (automatic)

`.github/workflows/android-apk.yml` runs `expo prebuild` + Gradle on every push touching `mobile/`
and attaches the APK to the **android-latest** GitHub release:
https://github.com/Rudra-Kapoor/kovi-running-app/releases/tag/android-latest

Repository variables/secrets it reads (all optional):

| Name | Type | Purpose |
|------|------|---------|
| `API_URL` | variable | API base URL baked into the app (default Render URL) |
| `GOOGLE_MAPS_ANDROID_KEY` | secret | Google Maps tiles (without it the map is blank; the route still draws) |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | variables | Google Sign-In |
| `INSTAGRAM_APP_ID` | variable | Story share attribution |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | secrets | Production signing. Without them the build is signed with Expo's debug keystore (consistent across builds, fine for testing, not for Play Store). |

### iOS and store builds (EAS)

iOS builds require Apple credentials, so they go through EAS Build:

```bash
npm i -g eas-cli && eas login
cd mobile
eas build -p ios --profile production      # or -p android for an AAB
eas submit -p ios
```

Profiles are in `mobile/eas.json`. Set `EXPO_PUBLIC_API_URL` there (or as an EAS secret) to the deployed API.

## Third-party keys still needed for full functionality

| Feature | What to create | Where it goes |
|---------|----------------|---------------|
| Google Maps tiles in native builds | Maps SDK keys (Android, iOS) in Google Cloud | `GOOGLE_MAPS_ANDROID_KEY` / `GOOGLE_MAPS_IOS_KEY` |
| Google Sign-In | OAuth client IDs (web, Android, iOS) | mobile `EXPO_PUBLIC_GOOGLE_*`, API `GOOGLE_CLIENT_IDS` |
| Apple Sign-In | Enable capability for `com.kovi.running` | nothing else - API checks `APPLE_BUNDLE_ID` |
| Password-reset emails | Any SMTP provider | API `MAIL_DRIVER=smtp` + `SMTP_*` |
| Instagram attribution | Meta app ID | `EXPO_PUBLIC_INSTAGRAM_APP_ID` |

Email/password auth, run tracking, events, leaderboards and story cards work without any of these.
