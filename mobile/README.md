# Kovi mobile app (iOS + Android)

React Native with Expo SDK 57, TypeScript and Expo Router.

## What it does

- **Auth** - email sign-up/login, forgot password (6-digit emailed code), Google Sign-In, Apple Sign-In (iOS).
- **Onboarding** - name, optional photo, city/state/country, optional running club.
- **Home** - Start Run CTA, upcoming joined events, recent activities; recovers an interrupted run.
- **GPS run tracking** - start / pause / resume / finish with live distance, time and pace. Uses a
  background location task (Android foreground service, iOS background mode) so tracking continues
  with the screen off. GPS noise is filtered (accuracy > 35 m, teleports > 12 m/s, jitter < 2 m).
- **Event Run Mode** - "Start Event Run" links the run to the event; the server ranks it on the event
  leaderboard when the event distance is completed.
- **Post-run story card** - 1080x1920 branded card (distance, time, pace, route drawing, event, rank,
  sponsor logo when the event has one). Save to photos, share to Instagram Stories, or share sheet.
- **Events** - browse upcoming/past, details, join (once) with a club tag, leaderboard.
- **Global leaderboard** - 5K / 10K / 21K, filter by your city / state / country.
- **Profile** - totals, personal bests, activity history, joined events, edit profile.

## Run it

```bash
cp .env.example .env            # set EXPO_PUBLIC_API_URL to your API (LAN IP for a physical device)
npm install --legacy-peer-deps
npx expo start                  # scan the QR code with Expo Go, or press a / i
```

Everything except Google Sign-In works in **Expo Go**. If `EXPO_PUBLIC_API_URL` is not set, the app
targets port 3000 on the machine running Metro, which is right for local development.

### Native builds

```bash
npx expo run:android            # needs Android Studio / SDK
npx expo run:ios                # needs Xcode (macOS)
```

Or with EAS (`npm i -g eas-cli && eas login`): `eas build -p android --profile preview`,
`eas build -p ios --profile production`. Profiles are in `eas.json`.

CI builds an installable Android APK on every push to `main` and attaches it to the
`android-latest` GitHub release (see `.github/workflows/android-apk.yml`).

## Configuration

| Variable | Needed for |
|----------|-----------|
| `EXPO_PUBLIC_API_URL` | Pointing at the backend |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | Google Sign-In (buttons are hidden until set) |
| `EXPO_PUBLIC_INSTAGRAM_APP_ID` | Attribution on Instagram Stories share (optional) |
| `GOOGLE_MAPS_ANDROID_KEY`, `GOOGLE_MAPS_IOS_KEY` | Google Maps tiles in native builds (Expo Go has its own key) |

Apple Sign-In needs the "Sign in with Apple" capability on the bundle id `com.kovi.running` in your
Apple Developer account; the backend verifies the identity token against that bundle id.

## Instagram sharing

- **Android**: opens Instagram's story composer directly via the `ADD_TO_STORY` intent with the image.
- **iOS**: Instagram's pasteboard API needs native code, so the system share sheet is used and the
  user picks Instagram > Story. Both fall back to the share sheet if Instagram is not installed.

## Structure

```
app/                 routes (Expo Router)
  (auth)/            login, register, forgot-password
  (tabs)/            home, events, leaderboard, profile
  run.tsx            live tracking screen
  runs/[id].tsx      run detail + story card
  events/[id].tsx    event detail, join, leaderboard, Start Event Run
  onboarding.tsx, profile/edit.tsx
src/lib/             api client, auth context, run tracker, geo maths, story sharing
src/components/      UI kit, cards, StoryCard, RouteMap, SocialAuth
plugins/             Expo config plugin for release signing
```
