# Google Play: what to do, step by step

Checked against the Play Console rules of November 2026. Google changes these pages often: when a screen
asks something that is not here, answer what is true for the app (it collects nothing, shows no adverts, has no account).

## The files

| File | What it is |
|---|---|
| `plc-start-1.1.0.aab` | **The file you upload to Google Play.** |
| `plc-start-1.1.0.apk` | The same app as an APK, to install by hand on a phone and try it. Google Play does not take this one. |
| `upload-key.jks` + its password | Your **upload key**. Keep both in a safe place (and a copy somewhere else). Every update must be signed with it. Never put it in a public place. |

Facts about the build: application id `com.tryplc.app`, version `1.1.0`, version code `1`, minimum Android 8.0 (API 26),
target Android 16 (API 36), no permission at all.

**The application id is for ever.** After the first upload `com.tryplc.app` can never be changed.
If you want another one (the habit is your own domain turned around, for example `com.yourdomain.plcstart`),
build again before you upload: `LL_APP_ID=com.yourdomain.plcstart bash tools/build-apk.sh`.

## 1. Before you start

1. A Google Play developer account (one payment of US$25). Google checks your identity and asks you to confirm
   a real Android phone with the Play Console app.
2. A public web address for the privacy policy. Open `privacy.html` (in the `ladder-lab` folder), replace the
   three `[…]` places with your name, your email and the date, and put the file online: with the web version,
   or on any free static host. Google needs a normal web page, not a PDF.
3. Try the APK on your own phone first. This build was tested in a desktop browser engine with the Android
   bridge simulated, and checked with Android lint. It was **not** run on a real phone.

## 2. Create the app

Play Console → **Create app**

| Question | Answer |
|---|---|
| App name | PLC Start: Learn Ladder Logic |
| Default language | English (United States) |
| App or game | App |
| Free or paid | Free |
| Declarations | Accept both |

## 3. "Set up your app" (App content)

| Page | Answer |
|---|---|
| Privacy policy | The web address of your `privacy.html` |
| App access | All functionality is available without special access (there is no login) |
| Ads | No, my app does not contain ads |
| Content rating | Category: **Reference, News, or Educational**. Answer **No** to every question (no violence, no sexual content, no bad language, no drugs, no gambling, users cannot talk to each other, no location sharing, no purchases). Result: rated for everyone |
| Target audience | **13–15, 16–17, 18 and over**. Do not tick the ages under 13: the app is not made for children, and under 13 brings the Families rules |
| Appeals to children? | No |
| News app | No |
| Data safety | See the table below |
| Advertising ID | No, my app does not use an advertising ID |
| Government app | No |
| Financial features | My app does not provide any financial features |
| Health | My app does not have any health features |

### Data safety form

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data encrypted in transit? | Not asked when the answer above is No |
| Do you provide a way for users to request that their data is deleted? | Not asked when the answer above is No |

Why "No" is true: the app has no internet permission, no account, no advert and no analytics code.
Progress and programs are saved only on the phone. Google does not count data that never leaves the device as collected.

## 4. Store listing

Paste the texts from `listing.md` and upload the pictures of this folder.
Category: **Education**. Give a contact email (it is public).

## 5. Upload the app

1. **Testing → Internal testing → Create new release.**
2. **App signing**: choose *Use Google-generated key* (Play App Signing). Google keeps the real signing key;
   your `upload-key.jks` only proves that the upload comes from you. If you ever lose it, Google can reset it.
3. Upload `plc-start-1.1.0.aab`. Release name: `1.1.0`. Release notes: `First release.`
4. Add your own Google address as a tester, open the opt-in link on your phone, install from Play, and try the app.

## 6. The closed test (new personal accounts)

A **personal** developer account made after 13 November 2023 must run a closed test before production:

1. **Testing → Closed testing**: create a release with the same `.aab`.
2. Add at least **12 testers** (Google addresses). All 12 must opt in with the link and stay in for **14 days without a break**.
3. After the 14 days: **Dashboard → Apply for production**, and answer the questions about your test.

An organisation account does not need this step.

## 7. Production

**Production → Create new release**, use the same bundle or a newer one, choose the countries, send for review.
The first review often takes some days, sometimes more than a week.

## 8. Updates later

1. Raise the version in `js/engine.js` (`LL.APP.version`).
2. Build with a higher version code and the **same** upload key:

   ```
   LL_VERSION_CODE=2 LL_KEYSTORE=/path/upload-key.jks LL_KS_PASS='…' LL_KEY_ALIAS=upload bash tools/build-apk.sh
   ```
3. Upload the new `.aab`. The version code must go up with every upload.
4. Every year Google raises the target Android version. Today new apps and updates need API 36;
   from 31 August 2027 it is API 37. The numbers `TARGET` in `tools/build-apk.sh` and the platform download must follow.

## The name

- "Ladder Lab" was dropped: there is a registered US trademark LADDERLAB for PLC software, and other products use the name.
- "PLC Start" looked free in a web search (app stores, trademark lists, PLC products) in November 2026.
  A web search is not a legal check. Before you publish, look yourself:
  search "PLC Start" on Google Play, in the USPTO trademark search (tmsearch.uspto.gov) and, for Europe, in EUIPO eSearch.
- Brand names of PLC makers: use them only as plain words to say what the app teaches. No logos, no "official",
  not in the app name, not in the icon, not in the short description.
- Do not host the web version at an address with another company's product name in it.
