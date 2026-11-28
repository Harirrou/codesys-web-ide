package com.harirrou.fedyet.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.TextButton
import androidx.compose.runtime.remember
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.JoinResult
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.GlassField
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens

/** The first screen: start your own home, or look around a sample one. */
@Composable
fun WelcomeScreen(
    onStart: (homeName: String, myName: String) -> Unit,
    onSample: () -> Unit,
    onJoin: ((code: String, myName: String, onResult: (JoinResult) -> Unit) -> Unit)?,
) {
    val defaultHome = stringResource(R.string.welcome_home_default)
    var myName by rememberSaveable { mutableStateOf("") }
    var homeName by rememberSaveable { mutableStateOf(defaultHome) }
    var joining by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            stringResource(R.string.app_name),
            color = Tokens.Text,
            fontFamily = Bricolage,
            fontWeight = FontWeight.Bold,
            fontSize = 48.sp,
            lineHeight = 52.sp,
        )
        Text(stringResource(R.string.welcome_tagline), style = MaterialTheme.typography.bodyLarge, color = Tokens.TextMuted)
        Spacer(Modifier.height(4.dp))
        GlassCard {
            Point(stringResource(R.string.welcome_point_1))
            Spacer(Modifier.height(12.dp))
            Point(stringResource(R.string.welcome_point_2))
            Spacer(Modifier.height(12.dp))
            Point(stringResource(R.string.welcome_point_3))
        }
        Spacer(Modifier.height(4.dp))
        GlassField(myName, { myName = it }, stringResource(R.string.welcome_your_name), capitalization = KeyboardCapitalization.Words)
        GlassField(homeName, { homeName = it }, stringResource(R.string.welcome_home_name))
        PrimaryButton(
            text = stringResource(R.string.welcome_start),
            onClick = { onStart(homeName.trim(), myName.trim()) },
            enabled = myName.isNotBlank() && homeName.isNotBlank(),
        )
        if (onJoin != null) {
            GhostButton(stringResource(R.string.welcome_join), { joining = true })
        }
        GhostButton(stringResource(R.string.welcome_sample), onSample)
    }

    if (joining && onJoin != null) {
        JoinDialog(initialName = myName, onJoin = onJoin, onDismiss = { joining = false })
    }
}

/** Typing an invite code from someone already in the home. */
@Composable
private fun JoinDialog(
    initialName: String,
    onJoin: (code: String, myName: String, onResult: (JoinResult) -> Unit) -> Unit,
    onDismiss: () -> Unit,
) {
    var code by rememberSaveable { mutableStateOf("") }
    var name by rememberSaveable { mutableStateOf(initialName) }
    var busy by remember { mutableStateOf(false) }
    var problem by remember { mutableStateOf<JoinResult?>(null) }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        containerColor = Tokens.NightRaised,
        titleContentColor = Tokens.Text,
        shape = RoundedCornerShape(28.dp),
        title = { Text(stringResource(R.string.join_title), style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.join_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
                GlassField(code, { code = it.uppercase() }, stringResource(R.string.join_code), capitalization = KeyboardCapitalization.Characters)
                GlassField(name, { name = it }, stringResource(R.string.welcome_your_name), capitalization = KeyboardCapitalization.Words)
                val message = when (problem) {
                    JoinResult.NOT_FOUND -> stringResource(R.string.join_not_found)
                    JoinResult.EXPIRED -> stringResource(R.string.join_expired)
                    JoinResult.OFFLINE -> stringResource(R.string.join_offline)
                    JoinResult.NOT_AVAILABLE -> stringResource(R.string.join_not_available)
                    else -> null
                }
                if (message != null) Text(message, style = MaterialTheme.typography.bodySmall, color = Tokens.Due)
                if (busy) Text(stringResource(R.string.join_busy), style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    busy = true
                    problem = null
                    onJoin(code, name.trim()) { result ->
                        busy = false
                        if (result != JoinResult.JOINED) problem = result
                    }
                },
                enabled = !busy && code.isNotBlank() && name.isNotBlank(),
                colors = ButtonDefaults.textButtonColors(contentColor = Tokens.Mint),
            ) { Text(stringResource(R.string.join_action)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !busy, colors = ButtonDefaults.textButtonColors(contentColor = Tokens.Text)) {
                Text(stringResource(R.string.action_cancel))
            }
        },
    )
}

@Composable
private fun Point(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(painterResource(R.drawable.ic_check), contentDescription = null, tint = Tokens.Mint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = Tokens.Text)
    }
}
