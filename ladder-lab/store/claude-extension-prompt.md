# Prompt for Claude in Chrome: put PLC Start on Google Play

Copy everything below the line into Claude in Chrome, with the Google Play Console open and you logged in.
Before you start, fill in the 3 places in [square brackets] (your email, your privacy policy link, your
countries) and have these files on your computer: `plc-start-1.1.0.aab` and the store kit folder
(`plc-start-store-kit`, unzipped).

---

You are helping me publish my Android app on Google Play. I am logged in to Google Play Console
(https://play.google.com/console). Fill in the forms with the exact values below. Rules:

- Do NOT pay anything, do NOT accept new legal agreements, do NOT change account settings, do NOT delete anything.
- When a step needs me (choosing a file from my computer, identity or phone checks, a password, a payment,
  a legal declaration checkbox, or anything not written here), STOP and tell me exactly what to do.
- Do NOT press "Send for review", "Start rollout to production" or "Publish" without asking me first.
- After each page, press Save and tell me what you filled in.
- If a page looks different from these notes, tell me before you guess.

## 1. Create the app (All apps → Create app)

- App name: `PLC Start: Learn Ladder Logic`
- Default language: English (United States) – en-US
- App or game: App
- Free or paid: Free
- Declarations (Developer Program Policies, US export laws): show them to me and let me tick them.

## 2. App content (Policy → App content, or "Set up your app" on the Dashboard)

- Privacy policy URL: `[MY PRIVACY POLICY LINK]`
- App access: All functionality is available without any special access (no login).
- Ads: No, my app does not contain ads.
- Content rating: email `[MY EMAIL]`, category "Reference, News, or Educational".
  Answer **No** to every question (no violence, no sexual content, no bad language, no drugs, no alcohol or tobacco,
  no gambling, no user interaction or chat, no sharing of location, no digital purchases, no user generated content).
  Save and submit the questionnaire.
- Target audience and content: ages **13–15, 16–17, 18 and over** only (NOT under 13).
  The app does not appeal to children. No.
- News app: No.
- Data safety:
  - Does your app collect or share any of the required user data types? **No**.
  - (If it asks more: the app has no internet permission, no account, no ads, no analytics; all data stays on the phone.)
  - Save and submit.
- Advertising ID: No, my app does not use an advertising ID.
- Government app: No.
- Financial features: My app does not provide any financial features.
- Health apps: My app does not have any health features.

## 3. Main store listing (Grow users → Store presence → Main store listing)

- App name: `PLC Start: Learn Ladder Logic`
- Short description:
```
Learn PLC ladder logic: 84 lessons, a simulator with 56 machines, 218 tasks.
```
- Full description:
```
PLC Start teaches you to program a PLC in ladder logic, from the first contact to the level of a job interview. You do not only read: you build the program, run it on a machine on the screen, and tests check it like a commissioning engineer would.

WHAT IS INSIDE

• 84 short lessons. Each one explains what an instruction is, why it exists and where it is used, with a live rung you can press.
• The Lab: a ladder editor and a PLC simulator. Contacts, coils, set / reset, timers, counters, compare, maths, shift registers, blocks, data blocks, PID, motion. Green shows where the power flows. Step scan by scan, force inputs, watch values and a trend.
• 56 machines to control: motor, conveyor, water tank, traffic light, pneumatic cylinders, bottle filling line, car wash, elevator, palletizer, robot cell, servo axis and more.
• 218 tasks from easy to hard. Press "Run tests" and the app presses the buttons, waits, and checks the outputs. Hints first, the solution last.
• Fault finding and bug hunts: the machine does not work, find out why.
• Circuits: wire real control circuits with contactors, timers and overload relays (direct start, reversing, star-delta and more), power them on and test them.
• Structured Text as a second language after ladder.
• Quizzes with 555 questions: predict the output, read a program, timers and counters, industrial networks, and questions asked in PLC job interviews with model answers.
• 73 calculators for project work: fill a tank, size a pump, a pipe, a cable or a power supply, scale an analog value. Each one shows the formula with your numbers, and many have a moving picture.
• A glossary with 338 terms and a cheat sheet you can print.

MADE FOR LEARNING

• Works without internet.
• No account, no adverts, no tracking. Your progress stays on your phone.
• Light and dark theme, phone and tablet.
• Export your work to a file and import it on another device.
• The program text can be shown in the style of the common PLC families, so you can carry what you learned to the software you use at work.

FOR WHO

Students, electricians, maintenance technicians and engineers who want to start with PLCs, or who prepare for a test or a job interview.

IMPORTANT

PLC Start is a training simulator. It does not connect to a real PLC and must not be used to control or to check a real machine. Always follow the documents of the maker and the safety rules of your site.

PLC Start is an independent app. It is not made by, linked to or approved by any PLC maker. Product names of other companies belong to their owners and are used only to describe what you can learn.
```
- App icon: `icon-512.png` (ask me to choose the file)
- Feature graphic: `feature-graphic-1024x500.png` (ask me)
- Phone screenshots, in this order: `phone-1.png` to `phone-8.png` (ask me)
- 7-inch tablet screenshots: `tablet-1.png` to `tablet-4.png` (ask me)
- 10-inch tablet screenshots: the same `tablet-1.png` to `tablet-4.png` (ask me)
- Save.

## 4. Store settings (Grow users → Store presence → Store settings)

- App category: Education
- Tags: choose only education tags that fit (for example "Education" / "Engineering" if offered). Max 5.
- Contact email: `[MY EMAIL]`
- Website: leave empty
- Save.

## 5. First release (Test and release → Testing → Internal testing)

- Create a new release.
- App signing: choose **"Use Google-generated key"** (Play App Signing), if asked.
- App bundle: `plc-start-1.1.0.aab` (ask me to choose the file). It is already signed with my upload key;
  no password is needed here.
- Release name: `1.1.0`
- Release notes (en-US):
```
First release.
```
- Testers: create an email list named "Me" with `[MY EMAIL]`.
- Save, then show me the summary and any errors or warnings. Ask me before you roll it out.

Facts about the app, if a form asks:
- Package name: com.tryplc.app
- Version: 1.1.0, version code 1
- Minimum Android 8.0 (API 26), target Android 16 (API 36)
- Permissions: none
- It works offline, has no account, no ads, no in-app purchases, no data collection
- It is a training simulator for PLC ladder logic, for students and technicians (13+)

## 6. When everything is done

Tell me:
1. which pages are complete and which still show a warning,
2. what I must do myself,
3. the opt-in link of the internal test, so I can install the app on my phone.

(Note for me: a personal developer account made after 13 Nov 2023 must run a closed test with at least 12 testers
for 14 days before it can apply for production. See play-console.md.)
