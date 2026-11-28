# Fed Yet

A shared pet care board for the whole household: one tap marks a task done, and everyone at home sees who did it and when.
Plan: `docs/build-plan.md`. Design: https://claude.ai/artifact/8SDfWWsnQ2fEXvErxQzgWQ

## What is here

| Folder | What it is | State |
|---|---|---|
| `engine/` | Pure Kotlin rules: what is due, done or overdue; the do-it-twice guard; reminders; "runs out" maths; the walk check | Done, 75 tests |
| `firestore/` | Database security rules, their tests, and a scripted "second phone" for end-to-end tests | Done, 30 tests |
| `app/` | The Android app | Complete except your own IDs: sync turns on when `app/google-services.json` exists. 41 tests |

Screens: welcome, home board, pet page, add/edit pet (with a photo and suggested tasks per kind of animal),
add/edit task, upcoming, supplies, add/edit supply, home settings with export.

Also built: a walk check on the board ("Good to walk / Take care / Better wait", from the forecast and an
estimate of pavement heat), reminders when a task is due and nobody has done it (with a Done button on the
notification), and a home-screen widget.

Checked on an Android 13 emulator: every screen, ticking a task, the second-dose warning, a reminder firing
in the background and its Done button, and the widget on the home screen.

How the app is put together:

- `app/.../data/HomeRepository.kt` is the one doorway to storage. Today `LocalHomeRepository` keeps the home in
  a JSON file on the phone. Sync means writing a second class with the same methods; no screen changes.
- `app/.../data/HomeEdits.kt` holds every change to a home as a pure, tested function.
- `app/.../ui/components/` holds the shared look (glass cards, glow rings, buttons, fields). New screens are
  built from these so the app stays consistent.

Every ID and URL the app needs lives in one file: `app/src/main/java/com/harirrou/fedyet/AppConfig.kt`.

## Running it on Windows

You need Android Studio (it brings Java and the Android tools). Open this folder in Android Studio and press Run,
or use a terminal in this folder:

```
gradlew.bat :engine:test                 rules engine tests
gradlew.bat :app:testDebugUnitTest       board logic tests
gradlew.bat :app:assembleDebug           builds app\build\outputs\apk\debug\app-debug.apk
```

Security-rule tests need Node.js and Java:

```
cd firestore
npm install
npm test
```

They run against a local emulator. Nothing touches a real Firebase project.

## Decisions made while building the engine

- **Which meal a log counts for depends only on its time**, never on other logs, so two phones that are both
  offline always agree. A task starts claiming logs twice as early as it starts showing as due: dinner given
  half an hour before its window is dinner; a missed breakfast given at lunchtime is still breakfast.
- **Medicine uses a longer safety gap** (three quarters of the normal spacing, against half for meals), so
  tomorrow's once-a-day tablet cannot quietly be given tonight.
- **A log from a phone whose clock is fast counts as made now.** Log times should be server times once sync exists.

## Sync between phones

- Turned on by adding `app/google-services.json` (see `docs/firebase-setup.md`). Without it the app keeps
  everything on the phone.
- Data model and rules: `app/.../data/FirestoreMapping.kt` and `firestore/firestore.rules`.
- A home started without a connection, or kept on the phone before sync was set up, is uploaded
  automatically once the phone can sign in.
- Reminders need no push server: when a reminder is due, the phone first fetches the latest from the
  cloud (up to 5 seconds) and stays quiet if someone else already did the task.

Tested end to end on an Android 13 emulator against the local Firebase emulators, with a scripted
second phone (`firestore/e2e/second-phone.mjs`): create a home, add a pet, invite, join, ticks
showing on the other phone with the right name, a reminder suppressed because the other phone did
the task while this app was closed, and a reminder shown for a task nobody did.

To run that setup yourself:

```
cd firestore
npx firebase emulators:start --only auth,firestore --project demo-fedyet
gradlew.bat :app:assembleDebug -Pfedyet.emulator=10.0.2.2     (in another terminal, from the fedyet folder)
node e2e/second-phone.mjs join <CODE> Sara
```

## Before release

1. **Your IDs**, all in two places:
   - `app/build.gradle.kts`: `admobAppId` (now Google's test app ID)
   - `app/src/main/java/com/harirrou/fedyet/AppConfig.kt`: `ADMOB_BANNER_ID` (now a test unit),
     `CONTACT_EMAIL`, `WEATHER_URL` (now MET Norway directly; point it at your Cloudflare proxy)
2. **Firebase**: `docs/firebase-setup.md`.
3. **Privacy policy**: fill in `docs/privacy-policy.md` and publish it on a web page (Play requires a link).
4. **Store listing**: `docs/store-listing.md`.
5. **Signing key**: in Android Studio, Build → Generate Signed App Bundle → create a new key store.
   Keep the file and both passwords somewhere safe; losing them means you can never update the app.
6. **AdMob**: in the AdMob console, set up the consent messages (GDPR and US states) under
   Privacy & messaging, or the consent form will not appear.

Not done yet (later versions): sitter pass (the rules already support it), a native ad card,
syncing pet photos.
