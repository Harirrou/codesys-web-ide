#!/usr/bin/env bash
# Localize the AI-painted art (generated with Higgsfield) so the game no
# longer depends on the CDN. Run this once from game/img/ on any machine
# with normal internet access:
#
#   cd game/img && bash fetch-art.sh
#
# The downloads land over the baked fallback files — the .jpg extension on
# PNG bytes is harmless to browsers and the Android WebView. Afterwards you
# can delete the BG_REMOTE block in js/main.js if you want fully-offline art.
set -euo pipefail

CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3GCWeZZjU0NmAmmShhKAENmTFXd"

curl -fSLo bg-title.jpg "$CDN/hf_20260716_224156_1dee9484-f31e-4e2e-9387-1e1501445690.png"
curl -fSLo bg-dawn.jpg  "$CDN/hf_20260716_224200_02c49906-6f8d-4bf7-a777-ca3703d05b67.png"
curl -fSLo bg-dusk.jpg  "$CDN/hf_20260716_224202_d7f7e07d-dfc1-45e3-bc17-54c900429fe5.png"
curl -fSLo bg-lair.jpg  "$CDN/hf_20260716_224206_787959a5-986b-4cf5-8dd6-ae39202adaf0.png"

# Painted app icon (1024x1024). Import into Android Studio via
# File > New > Image Asset to generate all launcher densities.
curl -fSLo app-icon.png "$CDN/hf_20260716_225142_2bc5764f-67d7-4e31-92fc-d10b2d4e52b1.png"

echo "Done. Art localized: bg-title/dawn/dusk/lair.jpg + app-icon.png"
