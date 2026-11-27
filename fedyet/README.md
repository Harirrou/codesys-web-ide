# Fed Yet

A shared pet care board for the whole household: one tap marks a task done, and everyone at home sees who did it and when.
Plan: `docs/build-plan.md`. Design: https://claude.ai/artifact/8SDfWWsnQ2fEXvErxQzgWQ

## What is here

| Folder | What it is | State |
|---|---|---|
| `engine/` | Pure Kotlin rules: what is due, done or overdue; the do-it-twice guard; reminders; "runs out" maths; the walk check | Done, 75 tests |
| `firestore/` | Database security rules and their tests | Done, 30 tests |
| `app/` | The Android app | Everything works on one phone: all screens, saving, reminders, widget, walk check. No sync yet. 35 tests |

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

## Before release

- `AppConfig.WEATHER_URL` points straight at MET Norway. Switch it to your own Cloudflare proxy, and put a real
  contact in `AppConfig.CONTACT_EMAIL` (MET Norway requires every app to identify itself).
- The walk check sends coordinates rounded to two decimals (about 1 km). Say so in the privacy policy.

## Next steps (from the plan)

1. Firestore-backed `HomeRepository`: anonymous sign-in, create or join a home by code. Needs a Firebase project.
2. Push between phones, so a reminder is cleared when someone else does the task.
3. Ads, consent, privacy policy, store listing.
