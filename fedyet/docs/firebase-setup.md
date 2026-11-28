# Turning on sync (Firebase) – step by step

Sync lets everyone in a home see the same board. Until these steps are done, the app keeps
everything on one phone and works exactly as before. Nothing in the code needs changing.

Time needed: about 15 minutes. You need a Google account. The free plan is enough to start.

## 1. Create the project

1. Open https://console.firebase.google.com and click **Create a project**.
2. Name it `fedyet`. Google Analytics: turn it **off** (the app does not use it).

## 2. Add the Android app

1. In the project, click the **Android** icon ("Add app").
2. Android package name: `com.harirrou.fedyet` (exactly this).
3. App nickname: `Fed Yet`. Leave the SHA-1 field empty. Click **Register app**.
4. Click **Download google-services.json**.
5. Put that file in the app folder, next to `build.gradle.kts`:
   `C:\Users\ASUS\MyAppsMobile\Fed Yet\fedyet\app\google-services.json`
6. Skip the remaining steps of the wizard (the project is already set up for it).

Keep this file out of public places. It is not a password, but it identifies your project.
It is already listed in `.gitignore`.

## 3. Turn on anonymous sign-in

1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Anonymous** → Enable → Save.

People never see a login: each phone gets an invisible ID.

## 4. Create the database

1. Left menu: **Build → Firestore Database → Create database**.
2. Location: **eur3 (Europe)**. This cannot be changed later. Europe keeps the GDPR story
   simple and works fine for US users.
3. Start in **production mode**.

## 5. Put the security rules in place

These rules decide who may read and write what. They are in `firestore/firestore.rules` and are
tested (30 tests). Copy them in:

1. **Firestore Database → Rules** tab.
2. Delete what is there, paste the whole content of `firestore/firestore.rules`, click **Publish**.

## 6. Build and try

Build the app as usual (Android Studio → Run, or `gradlew.bat assembleDebug`). The welcome screen
now shows **"I have an invite code"**, and the Home tab shows **"Invite someone"**.

Try it with two phones: start a home on one, tap **Invite someone**, type the code on the other.
A tick on one phone shows on the other within a few seconds.

## What it costs

The free plan allows 50,000 reads and 20,000 writes a day. A busy home uses a few hundred a day,
so the free plan covers roughly the first 100–200 active homes. Past that, Google asks for a
payment card (the "Blaze" plan, pay as you go). Set a budget alert at that point.
