package com.harirrou.fedyet.walk

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.engine.WalkCheck
import com.harirrou.fedyet.engine.WalkHour
import com.harirrou.fedyet.engine.WalkLevel
import com.harirrou.fedyet.engine.WalkReason
import com.harirrou.fedyet.ui.WhenFormatter
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.components.TextEditDialog
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens
import java.time.Instant
import java.util.Locale
import kotlin.math.roundToInt

/** Fahrenheit where people use it, Celsius everywhere else. */
fun temperature(celsius: Double, locale: Locale = Locale.getDefault()): String =
    if (locale.country in setOf("US", "LR", "MM", "BS", "BZ", "KY", "PW")) {
        "${(celsius * 9 / 5 + 32).roundToInt()}°F"
    } else {
        "${celsius.roundToInt()}°C"
    }

private fun levelColor(level: WalkLevel): Color = when (level) {
    WalkLevel.GOOD -> Tokens.Mint
    WalkLevel.CARE -> Tokens.Due
    WalkLevel.AVOID -> Tokens.Alert
}

/**
 * "Is it OK to walk now?" on the board: the verdict in big words, the one reason that matters
 * most, when it gets better, and the next twelve hours as a strip.
 */
@Composable
fun WalkCard(state: WalkState, now: Instant, formatter: WhenFormatter, viewModel: WalkViewModel) {
    val context = LocalContext.current
    var typing by remember { mutableStateOf(false) }

    val askLocation = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) viewModel.usePhoneLocation(context) else typing = true
    }
    val useLocation = {
        if (Places.hasLocationPermission(context)) {
            viewModel.usePhoneLocation(context)
        } else {
            askLocation.launch(android.Manifest.permission.ACCESS_COARSE_LOCATION)
        }
    }

    val present = WalkCheck.current(state.hours, now)
    GlassCard(glow = present?.let { levelColor(it.level) } ?: Tokens.Mint) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(38.dp).background(Color(0x12FFFFFF), CircleShape), contentAlignment = Alignment.Center) {
                Icon(painterResource(R.drawable.ic_walk), contentDescription = null, tint = Tokens.TextMuted, modifier = Modifier.size(21.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.walk_title), style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
                if (state.place != null && state.place.name.isNotBlank()) {
                    Text(state.place.name, style = MaterialTheme.typography.labelLarge, color = Tokens.Text)
                }
            }
            if (state.place != null) {
                Text(
                    stringResource(R.string.walk_change_place),
                    style = MaterialTheme.typography.labelLarge,
                    color = Tokens.Mint,
                    modifier = Modifier.clickable(role = Role.Button) { typing = true }.padding(vertical = 12.dp, horizontal = 4.dp),
                )
            }
        }
        Spacer(Modifier.height(12.dp))

        when {
            state.place == null -> {
                Text(stringResource(R.string.walk_setup_title), style = MaterialTheme.typography.titleLarge, color = Tokens.Text)
                Spacer(Modifier.height(6.dp))
                Text(stringResource(R.string.walk_setup_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
                problemText(state.problem)?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = Tokens.Due)
                }
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    GhostButton(stringResource(R.string.walk_type_town), { typing = true }, Modifier.weight(1f))
                    PrimaryButton(stringResource(R.string.walk_use_location), useLocation, Modifier.weight(1f))
                }
            }
            present == null && state.loading ->
                Text(stringResource(R.string.walk_loading), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
            present == null -> {
                Text(
                    problemText(state.problem) ?: stringResource(R.string.walk_no_forecast),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Tokens.Due,
                )
                Spacer(Modifier.height(12.dp))
                GhostButton(stringResource(R.string.walk_retry), viewModel::refresh)
            }
            else -> Verdict(present, state.hours, now, formatter)
        }
    }

    if (typing) {
        TextEditDialog(
            title = stringResource(R.string.walk_type_town),
            label = stringResource(R.string.walk_town_label),
            initial = "",
            onSave = {
                typing = false
                viewModel.useTown(context, it)
            },
            onDismiss = { typing = false },
        )
    }
}

@Composable
private fun problemText(problem: WalkProblem?): String? = when (problem) {
    WalkProblem.NO_FORECAST -> stringResource(R.string.walk_no_forecast)
    WalkProblem.PLACE_NOT_FOUND -> stringResource(R.string.walk_place_not_found)
    WalkProblem.LOCATION_UNAVAILABLE -> stringResource(R.string.walk_location_unavailable)
    null -> null
}

@Composable
private fun Verdict(present: WalkHour, hours: List<WalkHour>, now: Instant, formatter: WhenFormatter) {
    val color = levelColor(present.level)
    Text(
        text = stringResource(
            when (present.level) {
                WalkLevel.GOOD -> R.string.walk_good
                WalkLevel.CARE -> R.string.walk_care
                WalkLevel.AVOID -> R.string.walk_avoid
            },
        ),
        color = color,
        fontFamily = Bricolage,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 34.sp,
    )
    Spacer(Modifier.height(4.dp))
    Text(reasonText(present), style = MaterialTheme.typography.bodyMedium, color = Tokens.Text)

    if (present.level != WalkLevel.GOOD) {
        val window = WalkCheck.nextGoodWindow(hours, now)
        Spacer(Modifier.height(4.dp))
        Text(
            text = if (window != null) {
                stringResource(R.string.walk_window, formatter.moment(window.start), formatter.moment(window.end))
            } else {
                stringResource(R.string.walk_no_window)
            },
            style = MaterialTheme.typography.labelLarge,
            color = if (window != null) Tokens.Mint else Tokens.TextMuted,
        )
    }

    // The next twelve hours, one bar each.
    val ahead = hours.filter { !it.time.isBefore(present.time) }.take(12)
    if (ahead.size >= 2) {
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            ahead.forEach { hour ->
                Box(Modifier.weight(1f).height(8.dp).background(levelColor(hour.level), RoundedCornerShape(4.dp)))
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.walk_strip_now), style = MaterialTheme.typography.labelMedium, color = Tokens.TextMuted, modifier = Modifier.weight(1f))
            Text(formatter.time(ahead.last().time), style = MaterialTheme.typography.labelMedium, color = Tokens.TextMuted)
        }
    }
    Spacer(Modifier.height(10.dp))
    Text(stringResource(R.string.walk_credit), style = MaterialTheme.typography.labelMedium, color = Tokens.TextMuted)
}

/** The single most important thing to say about this hour. */
@Composable
private fun reasonText(hour: WalkHour): String {
    val avoid = hour.level == WalkLevel.AVOID
    return when (hour.reasons.firstOrNull()) {
        WalkReason.HOT_PAVEMENT -> stringResource(
            if (avoid) R.string.walk_hot_pavement_avoid else R.string.walk_hot_pavement_care,
            temperature(hour.pavementC),
        )
        WalkReason.HEAT -> stringResource(if (avoid) R.string.walk_heat_avoid else R.string.walk_heat_care, temperature(hour.airC))
        WalkReason.FREEZING -> stringResource(R.string.walk_freezing, temperature(hour.airC))
        WalkReason.COLD -> stringResource(R.string.walk_cold, temperature(hour.airC))
        WalkReason.THUNDER -> stringResource(R.string.walk_thunder)
        WalkReason.HEAVY_RAIN -> stringResource(R.string.walk_heavy_rain)
        WalkReason.RAIN -> stringResource(R.string.walk_rain)
        WalkReason.WIND -> stringResource(if (avoid) R.string.walk_wind_avoid else R.string.walk_wind_care)
        WalkReason.DARK -> stringResource(R.string.walk_dark)
        null -> stringResource(R.string.walk_line_good, temperature(hour.airC), temperature(hour.pavementC))
    }
}
