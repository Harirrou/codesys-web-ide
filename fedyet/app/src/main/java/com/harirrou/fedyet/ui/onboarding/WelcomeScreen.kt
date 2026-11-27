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
import androidx.compose.material3.Icon
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
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.GlassField
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens

/** The first screen: start your own home, or look around a sample one. */
@Composable
fun WelcomeScreen(onStart: (homeName: String, myName: String) -> Unit, onSample: () -> Unit) {
    val defaultHome = stringResource(R.string.welcome_home_default)
    var myName by rememberSaveable { mutableStateOf("") }
    var homeName by rememberSaveable { mutableStateOf(defaultHome) }

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
        GhostButton(stringResource(R.string.welcome_sample), onSample)
    }
}

@Composable
private fun Point(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(painterResource(R.drawable.ic_check), contentDescription = null, tint = Tokens.Mint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = Tokens.Text)
    }
}
