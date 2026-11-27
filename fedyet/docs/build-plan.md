# Fed Yet – shared pet care board (build plan, v1)

Working name: **Fed Yet** (check Google Play, USPTO and a domain before publishing; "PawCast" is an existing app and cannot be used).
Package: `com.harirrou.fedyet`
Store title (30 max): `Fed Yet: Shared Pet Care Log`
Tagline: Everyone at home knows what's been done.

Design reference (4 screens): https://claude.ai/artifact/8SDfWWsnQ2fEXvErxQzgWQ

## 1. What it is

One board the whole household shares. Every pet has a short list of needs (dinner, walk, tablet, litter, tank misting). One tap marks a need done, and every phone in the home shows who did it and when. It works for any animal, not only dogs and cats.

It is a status board, not a diary. The question it answers is "has it been done, and by whom?"

## 2. Why this, not weather

- More than one person caring for the same pet causes double feeding and double dosing. Poison-control and FDA guidance for pet medicine both say to keep a shared schedule or checklist when several people give medicine. That checklist is this app.
- 71% of dog owners and 78% of cat owners say they don't weigh food or don't know the right portion (Admiral survey, 2024).
- Users are angry at paywalls: 11pets moved existing data behind a subscription and reviews call it "ransom". Shared-care apps on iPhone limit the free tier to one pet.
- Shared-care apps are mostly iPhone-first, and none of the listings I found mention reptiles, fish or birds.
- Opened several times a day by several people in the same home. Every invite is a new install, so growth is built in.

Honest limit: the idea itself is not new. The opening is the position: Android-first, unlimited pets and people for free, every species, and a guard against doing something twice.

## 3. The promise (use it in the store listing)

- Unlimited pets and unlimited household members, free.
- No account, no email. Join a home with a code or QR.
- Your history is always exportable. Nothing already free ever moves behind a paywall.

## 4. Scope

### v1.0 (launch)
1. **Pets**: any species, with presets for dog, cat, rabbit, guinea pig, hamster, bird, fish tank, reptile, horse, chickens, other.
2. **Needs**: daily at set times (meals), every N days (reptile feeding, water change), monthly (flea dose), yearly (vaccines), one-off.
3. **Board**: one tap to mark done, shows who and when, undo.
4. **Do-it-twice guard**: medicine needs a deliberate confirm for a second dose; meals get a soft warning; walks have none.
5. **Home sharing**: invite by link, QR or 6-character code. Roles: owner, member.
6. **Reminders**: only when something is due and nobody has done it. Quiet "Sara fed Luna" updates are optional.
7. **Home-screen widget**: the board, with tap to log.
8. **Runs out**: food, litter and medicine stock. The app knows the daily amount from the log and says how many days are left.
9. **Export**: CSV per pet, full backup file, delete home.

### v1.1
- Sitter pass: time-limited access that can tick tasks and read the care sheet, plus a printable care sheet.
- Monthly cost per pet.

### v1.2
- Safety tab: US food recalls matched to the brands you log (FDA data), "Can they have it?" lookup, emergency card, small walk-check tile from the existing weather proxy.
- The lookup content must be checked by a vet before release. Until then, do not ship it.

## 5. Rules of the needs engine (test these first)

- Status is one of: not due yet, due, done, overdue. It is computed on the phone from the need's schedule and the log.
- Each need has a window (dinner 5–8 PM). Done inside the window counts for that slot.
- Interval needs count from the last time done, not from a fixed calendar day.
- Monthly on the 31st falls on the last day of shorter months.
- All times use the home's time zone, not the phone's, so a travelling member sees the home's day. Test both US and EU daylight-saving changes.
- Two people logging the same guarded need while offline: keep both logs and show "Logged twice: Sara 6:40, Omar 6:41".
- Undo marks a log as undone; it never deletes it.

## 6. Architecture

Kotlin, Jetpack Compose (Material 3), MVVM, Hilt, Coroutines/Flow · Firebase Auth (anonymous) · Cloud Firestore with offline persistence as the single data store · Firebase Cloud Messaging · one Cloudflare Worker for push fan-out · Glance widget · AlarmManager for reminders · DataStore for settings · Google Mobile Ads + UMP · minSdk 24, current Play targetSdk.

### Data model (Firestore)
```
/homes/{homeId}                 name, tz, createdAt, schemaVersion
/homes/{homeId}/members/{uid}   name, tint, role, joinedAt, expiresAt?, fcmTokens[]
/homes/{homeId}/pets/{petId}    name, species, breed?, born?, weight?, tint, archived
/homes/{homeId}/needs/{needId}  petId, kind, label, schedule{}, windowMinutes,
                                guard(none|soft|hard), amount?, supplyId?, lastDoneAt, active
/homes/{homeId}/days/{yyyy-mm-dd}  logs: { logId: {needId, petId, by, at, amount?, note?, undone?} }
/homes/{homeId}/supplies/{id}   petIds[], label, unit, size, remaining, perUse, price?, brand?
/invites/{code}                 homeId, role, expiresAt, createdBy
```
- One document per home per day holds that day's logs, so a change costs one read per phone, not one per log.
- `lastDoneAt` on the need is written in the same batch as the log, so interval needs never scan old days.

### Security rules (no server code needed to join)
- Only members of a home can read or write anything under it.
- A user creates their own member document by quoting an invite code; the rule checks the invite exists, points at this home and has not expired.
- Sitters (v1.1) can only add logs.

### Push
- When a phone writes a log, it calls the Worker with its Firebase ID token. The Worker verifies the token and sends an FCM data message to the other members.
- Receiving phones update the widget and cancel their pending "due" reminder. Without this, a second phone would still nag after dinner was already given, which breaks the core promise.

## 7. Screens

1. **Board** (home): pet cards, each with its needs as rows; status pill per pet; invite button.
2. **Pet page**: today's timeline with who did what, today's list, Runs out, month cost (v1.1).
3. **Upcoming**: next 30 days of monthly and yearly needs.
4. **Supplies**: all stock across pets, sorted by days left.
5. **Add pet / add need**: species presets do most of the work.
6. **Home & members**: invite, roles, export, delete.
7. **Sitter pass** (v1.1) and **Safety** (v1.2).

## 8. Design tokens ("household calm": light, grown-up, no cartoon)

| Token | Value |
|---|---|
| Ground | `#F3F4F0` |
| Card | `#FFFFFF`, border `#E2E5DE`, radius 20 |
| Ink | `#17211C` |
| Secondary text | `#56635C` |
| Done / primary | `#1E5A46` |
| Due | text `#8A5A00`, fill `#F2A93B`, pill `#FBE7C2` |
| Alert | `#B93A26` |
| Pet tints | `#2B5FA8`, `#7A3E7E`, `#1B7F86`, `#9A6A12` |
| Headings, numbers | Bricolage Grotesque 700 |
| Text | Figtree 400/500/600 |

- Every state is told apart by words and shape as well as colour (empty ring, filled check, dashed ring).
- Touch targets 44 px or more. A whole row is the button.
- Pets show their photo if the owner adds one, otherwise a coloured tile with the first letter.
- Dark theme uses the same tokens inverted; build it after the light theme is right.

## 9. Money

- Ads only, because the Play account cannot sell. One banner on Upcoming and Supplies, one labelled native card at the end of a pet's history. Nothing on the Board's first screen, no interstitials, no app-open ads, no sound. UMP consent first.
- Keep one `isUnlocked(feature)` module so billing can be added later without touching features.
- Later, not in v1: "running low, reorder" links through an affiliate programme. Check first which programmes accept and pay a Morocco-based publisher.
- Expect modest ad income per user. The case for this app is daily use and household invites, not a high rate per view.

## 10. Risks and open decisions

1. **Sync is the product.** If two phones disagree, the app has failed. The needs engine and sync rules get tests before any screen is built.
2. **Reminder reliability.** Late or missing reminders are the top complaint against rival apps. Test on Samsung, Xiaomi and Pixel.
3. **Firebase cost.** The free plan covers roughly the first few hundred active homes. Beyond that the pay-as-you-go plan needs a payment card on the Google Cloud account. Confirm that works for you before launch.
4. **Data region.** Firestore's region is permanent. Recommended: `eur3` (EU), which keeps the GDPR story simple.
5. **Crowding.** Several new iPhone apps do shared care; some will reach Android. Speed and the free promise are the defence.
6. **Safety content liability.** Recalls and the food lookup can cause harm if wrong. They ship only with sources shown and vet review.
7. **Name.** Not yet checked for trademarks.

## 11. Which model for which part

- **Fable**: this plan, the design, the data model and security rules, the needs-engine rules and their test cases, review of sync and push before release, the safety-content structure.
- **Opus**: project setup, Compose screens from the design, Firestore wiring, widget, reminders, the Worker, ads and consent, export, store listing, writing tests from the cases in section 5.
- **Come back to Fable** when a sync or reminder bug survives two fix attempts, before the first public release, and for any change to the security rules.

## 12. Build prompt for the Opus session

```
You are a senior Android engineer working in Claude Code. Build "Fed Yet: Shared Pet Care Log"
(package com.harirrou.fedyet) following the attached plan file exactly (fedyet-build-plan.md)
and the design at https://claude.ai/artifact/8SDfWWsnQ2fEXvErxQzgWQ.

How to work with me:
- I'm on Windows, I code in Python only, no Git or JavaScript. Explain every terminal command step by step.
- ASK ME whenever you need something (Firebase project, AdMob IDs, Cloudflare access, decisions, tests on my phone).
  One question at a time. Never guess credentials.
- Show the file tree first, build module by module, build and fix errors after each step,
  then give me a short manual checklist.
- All IDs and URLs (Firebase config, AdMob IDs, Worker URL, contact email) in ONE config file; tell me its path.
- Contact email: [YOUR_CONTACT_EMAIL]

Correctness first:
- Implement the needs engine (plan section 5) as a pure Kotlin module with unit tests before any UI:
  daily, interval, monthly (31st), yearly, windows, home time zone, US and EU daylight-saving changes,
  offline double-log, undo. Show me the test results table.
- Write the Firestore security rules with emulator tests: non-members read nothing, invite join works
  only with a valid unexpired code.

Order of work:
1) Needs engine + tests
2) Firestore data layer, anonymous sign-in, create/join home by code, security rules + tests
3) Board screen with tap-to-log, undo and the do-it-twice guard
4) Add pet / add need with species presets
5) Push fan-out Worker + reminders that cancel when someone else has done the task
6) Pet page, Upcoming, Supplies ("runs out")
7) Home-screen widget
8) Export and delete
9) Ads + UMP consent + entitlements module
10) Privacy policy, store listing (English), release .aab + Play upload checklist
Stop after step 2 and after step 5 so the sync and push design can be reviewed before continuing.
```
