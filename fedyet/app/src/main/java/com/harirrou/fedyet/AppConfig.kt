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

    /** AdMob IDs. Added in build step 9. Until then no ads are loaded. */
    const val ADMOB_APP_ID = "TODO_ADMOB_APP_ID"
    const val ADMOB_BANNER_ID = "TODO_ADMOB_BANNER_ID"
    const val ADMOB_NATIVE_ID = "TODO_ADMOB_NATIVE_ID"
}
