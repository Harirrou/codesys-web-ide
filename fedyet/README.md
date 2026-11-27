# Fed Yet

A shared pet care board for the whole household: one tap marks a task done, and everyone at home sees who did it and when.
Plan: `docs/build-plan.md`. Design: https://claude.ai/artifact/8SDfWWsnQ2fEXvErxQzgWQ

## What is here

| Folder | What it is | State |
|---|---|---|
| `engine/` | Pure Kotlin rules: what is due, done or overdue; the do-it-twice guard; reminders; "runs out" maths | Done, 60 tests |
| `firestore/` | Database security rules and their tests | Done, 30 tests |
| `app/` | The Android app. Board screen on a built-in sample home | First screen works on sample data; no sync yet |

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

## Next steps (from the plan)

2. Firestore data layer, anonymous sign-in, create or join a home by code. Needs a Firebase project.
3. Add pet and add task, with species presets.
4. Push between phones, and reminders that cancel when someone else has done the task.
