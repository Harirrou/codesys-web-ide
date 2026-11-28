package com.harirrou.fedyet.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import com.harirrou.fedyet.AppConfig
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Quiet ads, after consent. Google's consent form (UMP) runs first and decides, per country,
 * whether ads may be requested and whether they may be personalised. Rules kept from the plan:
 * one banner on Upcoming and Supplies, never on the Board or in dialogs, no full-screen ads,
 * never sound.
 */
object Ads {
    private val started = AtomicBoolean(false)
    private val canShow = MutableStateFlow(false)
    private val privacyOptions = MutableStateFlow(false)

    /** True once consent allows requesting ads and the SDK has started. */
    val ready: StateFlow<Boolean> = canShow

    /** True where the law asks for a way to change privacy choices later (shown on the Home tab). */
    val privacyOptionsRequired: StateFlow<Boolean> = privacyOptions

    /** Call from the main screen's onCreate. Shows Google's consent form when it is needed. */
    fun gatherConsent(activity: Activity) {
        if (!AppConfig.ADS_ENABLED) return
        val consent = UserMessagingPlatform.getConsentInformation(activity)
        consent.requestConsentInfoUpdate(
            activity,
            ConsentRequestParameters.Builder().build(),
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { error ->
                    if (error != null) Log.w(TAG, "Consent form: ${error.message}")
                    afterConsent(activity, consent)
                }
            },
            { error ->
                Log.w(TAG, "Consent update: ${error.message}")
                afterConsent(activity, consent)
            },
        )
        // A choice made on an earlier run is enough to start straight away.
        afterConsent(activity, consent)
    }

    /** Opens Google's form for changing privacy choices. */
    fun showPrivacyOptions(activity: Activity) {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { error ->
            if (error != null) Log.w(TAG, "Privacy options: ${error.message}")
        }
    }

    private fun afterConsent(context: Context, consent: ConsentInformation) {
        privacyOptions.value = consent.privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        if (!consent.canRequestAds()) return
        if (started.getAndSet(true)) return
        MobileAds.initialize(context.applicationContext) { canShow.value = true }
    }

    private const val TAG = "FedYetAds"
}

/** One adaptive banner, as wide as the screen. Draws nothing until ads may be shown. */
@Composable
fun BannerAd(modifier: Modifier = Modifier) {
    val ready by Ads.ready.collectAsState()
    if (!ready || !AppConfig.ADS_ENABLED) return
    BoxWithConstraints(modifier.fillMaxWidth()) {
        val width = maxWidth.value.toInt()
        AndroidView(
            modifier = Modifier.fillMaxWidth(),
            factory = { context ->
                AdView(context).apply {
                    setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(context, width))
                    adUnitId = AppConfig.ADMOB_BANNER_ID
                    loadAd(AdRequest.Builder().build())
                }
            },
            onRelease = { it.destroy() },
        )
    }
}
