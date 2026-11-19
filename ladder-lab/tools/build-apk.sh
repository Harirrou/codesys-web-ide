#!/usr/bin/env bash
# Build the Android app (APK) of Ladder Lab without Android Studio and without Gradle.
#   bash tools/build-apk.sh [out.apk]
# It needs: java 17+, zip, unzip, curl, node, and network access to dl.google.com for the first run
# (the Android platform and build tools are downloaded once into the cache folder and checked).
# Environment:
#   LL_VERSION_NAME (default 1.0)   LL_VERSION_CODE (default 1: raise it for every update)
#   LL_KEYSTORE, LL_KS_PASS         the signing key. An update only installs over the old app when it is signed with
#                                   the SAME key. Without LL_KEYSTORE a key is made once in the cache folder.
#   LL_ANDROID_CACHE                where the Android tools and the default key are kept (default ~/.cache/ladderlab-android)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="${LL_ANDROID_CACHE:-$HOME/.cache/ladderlab-android}"
OUT="${1:-$ROOT/dist/ladder-lab.apk}"
VNAME="${LL_VERSION_NAME:-1.0}"; VCODE="${LL_VERSION_CODE:-1}"
B="$(mktemp -d)"; trap 'rm -rf "$B"' EXIT
mkdir -p "$CACHE" "$(dirname "$OUT")"

# 1. Android platform 34 (android.jar) and build tools 35.0.1 (aapt2, d8, zipalign, apksigner), checked by SHA-1
fetch() { # name sha1 folder-in-zip
  if [ ! -d "$CACHE/$3" ]; then
    echo "downloading $1"
    curl -fsS --retry 3 -o "$CACHE/$1" "https://dl.google.com/android/repository/$1"
    echo "$2  $CACHE/$1" | sha1sum -c - >/dev/null
    unzip -q -o "$CACHE/$1" -d "$CACHE" && rm "$CACHE/$1"
  fi
}
fetch platform-34-ext7_r03.zip 1f2e9478d6a7601425ceaa553311dc43191f103d android-34
fetch build-tools_r35.0.1_linux.zip e009a9b188cfeb1d2b4c318ab5cb4f1ddc368861 android-15 # 34.0.0 has a d8 that fails on Java 21
JAR="$CACHE/android-34/android.jar"; BT="$CACHE/android-15"

# 2. the web app as assets: the same files as the web version, with the fonts inside (no network on the phone)
A="$B/assets"; mkdir -p "$A"
cp -r "$ROOT/css" "$ROOT/js" "$ROOT/icon.svg" "$A/"
cp -r "$ROOT/android/fonts" "$A/fonts"; cp "$ROOT/android/fonts.css" "$A/fonts.css"
node -e '
  const fs = require("fs"); let h = fs.readFileSync(process.argv[1], "utf8");
  h = h.replace(/<link rel="preconnect"[^>]*>\n/g, "").replace(/<link rel="manifest"[^>]*>\n/, "");
  const n = h.length; h = h.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, "<link rel=\"stylesheet\" href=\"fonts.css\">");
  if (h.length === n || /https?:\/\//.test(h.replace(/xmlns="[^"]*"/g, ""))) { console.error("index.html still points to the network"); process.exit(1); }
  fs.writeFileSync(process.argv[2], h);' "$ROOT/index.html" "$A/index.html"

# 3. resources and manifest → base APK, then the Java code → classes.dex
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" -I "$JAR" --manifest "$ROOT/android/AndroidManifest.xml" -A "$A" --java "$B/gen" \
  --min-sdk-version 26 --target-sdk-version 34 --version-code "$VCODE" --version-name "$VNAME" "$B/res.zip"
mkdir -p "$B/classes" "$B/dex"
javac -nowarn --release 11 -cp "$JAR" -d "$B/classes" $(find "$ROOT/android/java" "$B/gen" -name '*.java')
"$BT/d8" --release --lib "$JAR" --min-api 26 --output "$B/dex" $(find "$B/classes" -name '*.class')
(cd "$B/dex" && zip -q -j "$B/base.apk" classes.dex)

# 4. align and sign (APK signature v2 and v3)
"$BT/zipalign" -f -p 4 "$B/base.apk" "$B/aligned.apk"
KS="${LL_KEYSTORE:-$CACHE/ladderlab.keystore}"; KP="${LL_KS_PASS:-ladderlab}"
if [ ! -f "$KS" ]; then
  echo "making a new signing key: $KS (keep this file: updates must be signed with it)"
  keytool -genkeypair -keystore "$KS" -storepass "$KP" -keypass "$KP" -alias ladderlab -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Ladder Lab" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$KP" --key-pass "pass:$KP" --out "$OUT" "$B/aligned.apk"
rm -f "$OUT.idsig"
"$BT/apksigner" verify --min-sdk-version 26 "$OUT"
echo "wrote $OUT ($(du -k "$OUT" | cut -f1) KB), version $VNAME ($VCODE)"
