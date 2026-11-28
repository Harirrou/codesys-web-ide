package com.harirrou.fedyet.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.harirrou.fedyet.AppContainer
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.theme.Tokens

/**
 * What the screens need to know about reminders.
 *
 * @param shouldAsk true when the "turn on reminders" card belongs on the board.
 * @param blocked true when reminders are wanted but the phone will not show them.
 */
class ReminderUi(
    val enabled: Boolean,
    val shouldAsk: Boolean,
    val blocked: Boolean,
    val turnOn: () -> Unit,
    val notNow: () -> Unit,
    val setEnabled: (Boolean) -> Unit,
)

@Composable
fun rememberReminderUi(container: AppContainer, home: HomeSnapshot): ReminderUi {
    val context = LocalContext.current
    val settings = container.reminderSettings
    val enabled by settings.enabled.collectAsStateWithLifecycle()
    val needsPermission = Build.VERSION.SDK_INT >= 33

    fun isGranted() = !needsPermission ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    var granted by remember { mutableStateOf(isGranted()) }
    var asked by remember { mutableStateOf(settings.askedAlready) }

    val request = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        granted = ok
        asked = true
        settings.askedAlready = true
        container.reminders.sync(home)
    }

    val turnOn = {
        settings.setEnabled(true)
        if (needsPermission && !granted) request.launch(Manifest.permission.POST_NOTIFICATIONS) else container.reminders.sync(home)
    }

    return ReminderUi(
        enabled = enabled,
        shouldAsk = enabled && !granted && !asked && !home.isSample && home.needs.isNotEmpty(),
        blocked = enabled && !granted,
        turnOn = turnOn,
        notNow = {
            asked = true
            settings.askedAlready = true
        },
        setEnabled = { on ->
            if (on) {
                turnOn()
            } else {
                settings.setEnabled(false)
                container.reminders.sync(home)
            }
        },
    )
}

/** Asked once, on the board, after the first task exists: the moment reminders start to matter. */
@Composable
fun ReminderCard(ui: ReminderUi) {
    GlassCard(glow = Tokens.Due) {
        Text(stringResource(R.string.reminder_ask_title), style = MaterialTheme.typography.titleLarge, color = Tokens.Text)
        Spacer(Modifier.height(6.dp))
        Text(stringResource(R.string.reminder_ask_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            GhostButton(stringResource(R.string.reminder_not_now), ui.notNow, Modifier.weight(1f))
            PrimaryButton(stringResource(R.string.reminder_turn_on), ui.turnOn, Modifier.weight(1f))
        }
    }
}
