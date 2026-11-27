package com.harirrou.fedyet.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R

/**
 * Design tokens for the "Cinematic glow" look: a deep night ground, a soft glow at the top
 * that follows the time of day, glass-like cards, and each pet's own colour as the accent.
 * Keep in step with docs/build-plan.md section 8.
 */
object Tokens {
    val Night = Color(0xFF0B0E14)
    val NightRaised = Color(0xFF161B27)

    // Glass: white at low strength over the night ground. No real blur is used.
    val GlassTop = Color(0x21FFFFFF)
    val GlassBottom = Color(0x0FFFFFFF)
    val GlassEdgeTop = Color(0x3DFFFFFF)
    val GlassEdgeBottom = Color(0x12FFFFFF)
    val Hairline = Color(0x17FFFFFF)
    val Track = Color(0x1FFFFFFF)

    val Text = Color(0xFFF2F5FA)
    val TextMuted = Color(0xFFA9B4C6)
    val Due = Color(0xFFF5B94A)
    val Alert = Color(0xFFFF8571)
    val Mint = Color(0xFF6EE7B7)
}

/** The two glow colours for a time of day. */
data class Ambient(val near: Color, val far: Color)

fun ambientFor(hour: Int): Ambient = when (hour) {
    in 5..7 -> Ambient(Color(0xFFFF9E7A), Color(0xFF7C6BE0))   // dawn
    in 8..15 -> Ambient(Color(0xFF3FA9F5), Color(0xFF2DD4BF))  // day
    in 16..18 -> Ambient(Color(0xFFFFB347), Color(0xFFFF6F61)) // golden hour
    in 19..21 -> Ambient(Color(0xFF8B6CFF), Color(0xFF3B5BDB)) // dusk
    else -> Ambient(Color(0xFF3A56C4), Color(0xFF1B2A6B))      // night
}

val Bricolage = FontFamily(
    Font(R.font.bricolage_grotesque_semibold, FontWeight.SemiBold),
    Font(R.font.bricolage_grotesque_bold, FontWeight.Bold),
)

val Figtree = FontFamily(
    Font(R.font.figtree_regular, FontWeight.Normal),
    Font(R.font.figtree_medium, FontWeight.Medium),
    Font(R.font.figtree_semibold, FontWeight.SemiBold),
)

private val Colors = darkColorScheme(
    primary = Tokens.Mint,
    onPrimary = Tokens.Night,
    background = Tokens.Night,
    onBackground = Tokens.Text,
    surface = Tokens.NightRaised,
    onSurface = Tokens.Text,
    onSurfaceVariant = Tokens.TextMuted,
    surfaceContainerHigh = Tokens.NightRaised,
    outline = Tokens.TextMuted,
    outlineVariant = Tokens.Hairline,
    error = Tokens.Alert,
    onError = Tokens.Night,
)

private val Type = Typography(
    headlineLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 34.sp, lineHeight = 38.sp),
    titleLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 21.sp),
    bodyLarge = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.Medium, fontSize = 15.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.Medium, fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 18.sp),
    labelMedium = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 16.sp),
)

@Composable
fun FedYetTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, typography = Type, content = content)
}
