#!/usr/bin/env bash
# Build the Android app of PLC Start without Android Studio and without Gradle:
#   an APK (to install by hand) and an AAB (the file Google Play wants).
#   bash tools/build-apk.sh [output folder]        → <folder>/plc-start-<version>.apk and .aab
# It needs: java 17+, maven, zip, unzip, curl, node, and network access to dl.google.com for the first run
# (the Android platform, the build tools and Google's bundletool are downloaded once into the cache folder).
# Environment:
#   LL_VERSION_NAME (default: the version in js/engine.js)   LL_VERSION_CODE (default 1: Google Play wants a higher
#                                   number for every upload)
#   LL_APP_ID                       the id of the app on the phone and on Google Play (default com.tryplc.app).
#                                   It can never be changed after the first upload to Google Play.
#   LL_KEYSTORE, LL_KS_PASS, LL_KEY_ALIAS   the signing key (for Google Play: your upload key). An update only installs
#                                   over the old app when it is signed with the SAME key. Without LL_KEYSTORE a key is
#                                   made once in the cache folder.
#   LL_ANDROID_CACHE                where the Android tools and the default key are kept (default ~/.cache/plcstart-android)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="${LL_ANDROID_CACHE:-$HOME/.cache/plcstart-android}"
OUTDIR="${1:-$ROOT/dist}"
VNAME="${LL_VERSION_NAME:-$(sed -nE "s/.*LL\.APP = \{[^}]*version: '([^']+)'.*/\1/p" "$ROOT/js/engine.js")}"; VCODE="${LL_VERSION_CODE:-1}"; APPID="${LL_APP_ID:-com.tryplc.app}"
MINSDK=26; TARGET=36
B="$(mktemp -d)"; trap 'rm -rf "$B"' EXIT
mkdir -p "$CACHE" "$OUTDIR"
APK="$OUTDIR/plc-start-$VNAME.apk"; AAB="$OUTDIR/plc-start-$VNAME.aab"

# 1. Android platform 36 (android.jar) and build tools 36 (aapt2, d8, zipalign, apksigner), checked by SHA-1
fetch() { # name sha1 folder-in-zip
  if [ ! -d "$CACHE/$3" ]; then
    echo "downloading $1"
    curl -fsS --retry 3 -o "$CACHE/$1" "https://dl.google.com/android/repository/$1"
    echo "$2  $CACHE/$1" | sha1sum -c - >/dev/null
    unzip -q -o "$CACHE/$1" -d "$CACHE" && rm "$CACHE/$1"
  fi
}
fetch platform-36_r02.zip 2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576 android-36
fetch build-tools_r36_linux.zip b0b6376977657e8ad9b969bacf4093601da2c6fb android-16
JAR="$CACHE/android-36/android.jar"; BT="$CACHE/android-16"
# bundletool (makes the AAB) with its libraries, from Google's Maven folder
BTL="$CACHE/bundletool-1.18.3"
if [ ! -d "$BTL" ]; then
  echo "downloading bundletool"
  mkdir -p "$B/bt"
  cat > "$B/bt/pom.xml" <<'POM'
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion>
<groupId>local</groupId><artifactId>bundletool-libs</artifactId><version>1</version>
<repositories><repository><id>google</id><url>https://dl.google.com/dl/android/maven2/</url></repository></repositories>
<dependencies><dependency><groupId>com.android.tools.build</groupId><artifactId>bundletool</artifactId><version>1.18.3</version></dependency></dependencies>
</project>
POM
  MVN=(mvn -q -B -f "$B/bt/pom.xml")
  if [ -n "${HTTPS_PROXY:-}" ]; then # Maven does not read the proxy from the environment
    PH="$(echo "$HTTPS_PROXY" | sed -E 's#^[a-z]+://##; s#/$##')"
    echo "<settings><proxies><proxy><id>p</id><active>true</active><protocol>https</protocol><host>${PH%:*}</host><port>${PH##*:}</port></proxy></proxies></settings>" > "$B/bt/settings.xml"
    MVN+=(-s "$B/bt/settings.xml")
  fi
  "${MVN[@]}" dependency:copy-dependencies -DoutputDirectory="$B/bt/lib"
  mv "$B/bt/lib" "$BTL"
fi
bundletool() { java -cp "$BTL/*" com.android.tools.build.bundletool.BundleToolMain "$@"; }

# 2. the web app as assets: the same files as the web version (it carries its own fonts, so no network on the phone)
A="$B/assets"; mkdir -p "$A"
cp -r "$ROOT/css" "$ROOT/js" "$ROOT/icon.svg" "$A/"
cp -r "$ROOT/fonts" "$A/fonts"; cp "$ROOT/fonts.css" "$A/fonts.css"
node -e '
  const fs = require("fs"); let h = fs.readFileSync(process.argv[1], "utf8");
  h = h.replace(/<link rel="manifest"[^>]*>\n/, "");
  if (!/href="fonts\.css"/.test(h) || /https?:\/\//.test(h.replace(/xmlns="[^"]*"/g, ""))) { console.error("index.html must use the local fonts and no network address"); process.exit(1); }
  fs.writeFileSync(process.argv[2], h);' "$ROOT/index.html" "$A/index.html"

# 3. resources and manifest, then the Java code → classes.dex
LINK=(-I "$JAR" --manifest "$ROOT/android/AndroidManifest.xml" -A "$A" --rename-manifest-package "$APPID"
  --min-sdk-version "$MINSDK" --target-sdk-version "$TARGET" --version-code "$VCODE" --version-name "$VNAME" "$B/res.zip")
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" --java "$B/gen" "${LINK[@]}"
mkdir -p "$B/classes" "$B/dex"
javac -nowarn --release 11 -cp "$JAR" -d "$B/classes" $(find "$ROOT/android/java" "$B/gen" -name '*.java')
"$BT/d8" --release --lib "$JAR" --min-api "$MINSDK" --output "$B/dex" $(find "$B/classes" -name '*.class')

# 4. the signing key
KS="${LL_KEYSTORE:-$CACHE/plcstart.keystore}"; KP="${LL_KS_PASS:-plcstart}"; KA="${LL_KEY_ALIAS:-upload}"
if [ ! -f "$KS" ]; then
  echo "making a new signing key: $KS (keep this file: updates must be signed with it)"
  keytool -genkeypair -keystore "$KS" -storepass "$KP" -keypass "$KP" -alias "$KA" -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=PLC Start" >/dev/null 2>&1
fi

# 5. the APK: add the code, align, sign (APK signature v2 and v3), check
(cd "$B/dex" && zip -q -j "$B/base.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$B/base.apk" "$B/aligned.apk"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$KA" --ks-pass "pass:$KP" --key-pass "pass:$KP" --out "$APK" "$B/aligned.apk"
rm -f "$APK.idsig"
"$BT/apksigner" verify --min-sdk-version "$MINSDK" "$APK"

# 6. the AAB for Google Play: the same parts in the bundle layout, built by bundletool, signed with jarsigner
"$BT/aapt2" link --proto-format -o "$B/proto.apk" "${LINK[@]}"
M="$B/module"; mkdir -p "$M/manifest" "$M/dex"
(cd "$M" && unzip -q "$B/proto.apk" && mv AndroidManifest.xml manifest/ && cp "$B/dex/classes.dex" dex/ && zip -q -r "$B/base.zip" .)
rm -f "$AAB"
bundletool build-bundle --modules="$B/base.zip" --output="$AAB"
jarsigner -keystore "$KS" -storepass "$KP" -keypass "$KP" -sigalg SHA256withRSA -digestalg SHA-256 "$AAB" "$KA" >/dev/null
bundletool validate --bundle="$AAB" >/dev/null
jarsigner -verify "$AAB" >/dev/null
# the bundle must turn into an installable APK, as Google Play will do it
bundletool build-apks --bundle="$AAB" --output="$B/test.apks" --mode=universal --aapt2="$BT/aapt2" \
  --ks="$KS" --ks-key-alias="$KA" --ks-pass="pass:$KP" --key-pass="pass:$KP" >/dev/null
unzip -q -o "$B/test.apks" universal.apk -d "$B" && "$BT/apksigner" verify --min-sdk-version "$MINSDK" "$B/universal.apk"
echo "wrote $APK ($(du -k "$APK" | cut -f1) KB) and $AAB ($(du -k "$AAB" | cut -f1) KB): $APPID, version $VNAME ($VCODE), Android $MINSDK to $TARGET"
