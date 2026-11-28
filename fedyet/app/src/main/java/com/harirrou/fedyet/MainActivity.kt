package com.harirrou.fedyet

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.harirrou.fedyet.ads.Ads
import com.harirrou.fedyet.ui.AppRoot
import com.harirrou.fedyet.ui.theme.FedYetTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // The app is dark, so the status and navigation bars use light icons.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        val container = (application as FedYetApp).container
        Ads.gatherConsent(this)
        setContent {
            FedYetTheme {
                AppRoot(container)
            }
        }
    }
}
