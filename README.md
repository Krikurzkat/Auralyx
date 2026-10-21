# Auralyx

Auralyx is a cross-platform music player project. This repository contains the web app, native mobile app, desktop app, and server workspace.

The Android app is being prepared for Google Play internal testing. The app name shown to users is Auralyx.

## Project structure

- `apps/web` — browser-based music player
- `apps/mobile` — Expo and React Native app for Android and iOS
- `apps/desktop` — desktop app
- `apps/server` — server workspace

## Requirements

- Node.js
- npm

Install the workspace dependencies from the repository root:

```sh
npm install
```

## Run the apps

Start the web app:

```sh
npm run dev:web
```

Start the mobile development server:

```sh
npm run dev:mobile
```

The root workspace also provides `npm run build`, `npm run lint`, and `npm run typecheck` to run the available checks across packages.

## Android builds

Android release builds use Expo Application Services (EAS). Sign in with the Expo account connected to this project, then run:

```sh
cd apps/mobile
npx eas-cli@latest build --platform android --profile production
```

The production profile creates an Android App Bundle for Play distribution. The `apk` profile is available for internal APK builds. Play Console submission requires a Play Console app and configured upload credentials.

## Android app scope and privacy

The current native Android app focuses on browsing and playing audio stored on the device, with playback controls available while the app is in the background. The native app is developed separately from the web app, so web features may not be available on mobile yet.

The Android privacy policy is in [`apps/mobile/PRIVACY_POLICY.md`](apps/mobile/PRIVACY_POLICY.md). Review and publish it at a stable public URL before production store review.
