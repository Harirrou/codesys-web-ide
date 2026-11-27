package com.harirrou.fedyet.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R

/** Design tokens ("household calm"). Keep in step with docs/build-plan.md section 8. */
object Tokens {
    val Ground = Color(0xFFF3F4F0)
    val Card = Color(0xFFFFFFFF)
    val CardBorder = Color(0xFFE2E5DE)
    val RowDivider = Color(0xFFECEEE8)
    val Ink = Color(0xFF17211C)
    val Muted = Color(0xFF56635C)
    val Spruce = Color(0xFF1E5A46)
    val SprucePill = Color(0xFFDDEBE4)
    val DueText = Color(0xFF8A5A00)
    val DuePill = Color(0xFFFBE7C2)
    val DuePillText = Color(0xFF6B4500)
    val Alert = Color(0xFFB93A26)
    val Ring = Color(0xFFB9C0B4)
    val Notice = Color(0xFFE7EAE3)
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

private val Colors = lightColorScheme(
    primary = Tokens.Spruce,
    onPrimary = Color.White,
    background = Tokens.Ground,
    onBackground = Tokens.Ink,
    surface = Tokens.Card,
    onSurface = Tokens.Ink,
    onSurfaceVariant = Tokens.Muted,
    surfaceContainerHigh = Tokens.Card,
    outline = Tokens.Ring,
    outlineVariant = Tokens.CardBorder,
    error = Tokens.Alert,
    onError = Color.White,
    inverseSurface = Tokens.Ink,
    inverseOnSurface = Color.White,
    inversePrimary = Color(0xFFF2C56B),
)

private val Type = Typography(
    headlineLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 30.sp, lineHeight = 34.sp),
    titleLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 19.sp, lineHeight = 24.sp),
    titleMedium = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.Medium, fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 18.sp),
    labelMedium = TextStyle(fontFamily = Figtree, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 16.sp),
)

@Composable
fun FedYetTheme(content: @Composable () -> Unit) {
    // Light only for now; the dark theme comes after the light one is right.
    MaterialTheme(colorScheme = Colors, typography = Type, content = content)
}
