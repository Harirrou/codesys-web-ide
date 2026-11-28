package com.harirrou.fedyet

/**
 * The ONE place for IDs, URLs and contact details.
 * Nothing here is secret, but every value marked TODO must be filled in before release.
 */
object AppConfig {
    /** Shown in the privacy policy and the store listing. */
    const val CONTACT_EMAIL = "TODO_CONTACT_EMAIL"

    /** Cloudflare Worker that fans out "someone logged a task" pushes. Added in build step 5. */
    const val PUSH_WORKER_URL = "TODO_WORKER_URL"

    /**
     * Hourly forecast for the walk check, in MET Norway "Locationforecast 2.0 compact" format.
     * Before release, point this at your own Cloudflare proxy (the one Kite Window uses) so
     * phones do not call MET Norway directly.
     */
    const val WEATHER_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"

    /** MET Norway refuses requests that do not say who is asking. Put the real contact here. */
    const val WEATHER_USER_AGENT = "FedYet/0.5 (Android; contact: $CONTACT_EMAIL)"

    /** Turns ads (and the consent form that comes before them) on or off for the whole app. */
    const val ADS_ENABLED = true

    /**
     * AdMob banner unit. This is Google's public TEST unit: it always shows a "Test Ad" and earns
     * nothing. Replace it with your own before release, together with ADMOB_APP_ID in
     * app/build.gradle.kts (the app ID has to live there because Android reads it from the manifest).
     */
    const val ADMOB_BANNER_ID = "ca-app-pub-3940256099942544/9214589741"
}
