package com.harirrou.fedyet.ui.components

import android.graphics.BitmapFactory
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.Member
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.ui.theme.Ambient
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// The shared pieces of the "Cinematic glow" look. Every screen is built from these.

/** The night ground with two soft glows at the top whose colours follow the time of day. */
@Composable
fun AmbientBackground(ambient: Ambient, content: @Composable () -> Unit) {
    val near by animateColorAsState(ambient.near, tween(1200), label = "ambientNear")
    val far by animateColorAsState(ambient.far, tween(1200), label = "ambientFar")
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Tokens.Night)
            .drawBehind {
                drawRect(
                    Brush.radialGradient(
                        colors = listOf(near.copy(alpha = 0.44f), Color.Transparent),
                        center = Offset(size.width * 0.12f, -size.width * 0.10f),
                        radius = size.width * 1.15f,
                    ),
                )
                drawRect(
                    Brush.radialGradient(
                        colors = listOf(far.copy(alpha = 0.30f), Color.Transparent),
                        center = Offset(size.width * 1.05f, size.width * 0.35f),
                        radius = size.width * 0.95f,
                    ),
                )
            },
    ) {
        content()
    }
}

/** A glass-like surface: faint white fill, a brighter top edge, and an optional colour glow in one corner. */
fun Modifier.glass(shape: Shape, glow: Color? = null): Modifier = this
    .clip(shape)
    .background(Brush.verticalGradient(listOf(Tokens.GlassTop, Tokens.GlassBottom)))
    .drawBehind {
        if (glow != null) {
            drawRect(
                Brush.radialGradient(
                    colors = listOf(glow.copy(alpha = 0.22f), Color.Transparent),
                    center = Offset(size.width * 0.10f, 0f),
                    radius = size.width * 0.80f,
                ),
            )
        }
    }
    .border(1.dp, Brush.verticalGradient(listOf(Tokens.GlassEdgeTop, Tokens.GlassEdgeBottom)), shape)

/** A progress ring with a soft glow, drawn clockwise from the top. */
fun DrawScope.glowRing(progress: Float, stroke: Float, brush: Brush, glow: Color) {
    val inset = stroke * 1.6f
    val arcSize = Size(size.width - inset * 2, size.height - inset * 2)
    val topLeft = Offset(inset, inset)
    drawArc(Tokens.Track, 0f, 360f, false, topLeft, arcSize, style = Stroke(stroke))
    if (progress <= 0f) return
    val sweep = 360f * progress.coerceIn(0f, 1f)
    rotate(-90f) {
        drawArc(glow.copy(alpha = 0.14f), 0f, sweep, false, topLeft, arcSize, style = Stroke(stroke * 2.8f, cap = StrokeCap.Round))
        drawArc(glow.copy(alpha = 0.26f), 0f, sweep, false, topLeft, arcSize, style = Stroke(stroke * 1.8f, cap = StrokeCap.Round))
        drawArc(brush, 0f, sweep, false, topLeft, arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
    }
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    glow: Color? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier.fillMaxWidth().glass(RoundedCornerShape(24.dp), glow).padding(16.dp),
        content = content,
    )
}

// ---- Pets and people ----

fun speciesArt(species: Species): Int? = when (species) {
    Species.DOG -> R.drawable.pet_dog
    Species.CAT -> R.drawable.pet_cat
    Species.RABBIT -> R.drawable.pet_rabbit
    Species.GUINEA_PIG -> R.drawable.pet_guinea_pig
    Species.HAMSTER -> R.drawable.pet_hamster
    Species.BIRD -> R.drawable.pet_bird
    Species.FISH -> R.drawable.pet_fish
    Species.REPTILE -> R.drawable.pet_reptile
    Species.HORSE -> R.drawable.pet_horse
    Species.CHICKEN -> R.drawable.pet_chicken
    Species.OTHER -> null
}

fun speciesName(species: Species): Int = when (species) {
    Species.DOG -> R.string.species_dog
    Species.CAT -> R.string.species_cat
    Species.RABBIT -> R.string.species_rabbit
    Species.GUINEA_PIG -> R.string.species_guinea_pig
    Species.HAMSTER -> R.string.species_hamster
    Species.BIRD -> R.string.species_bird
    Species.FISH -> R.string.species_fish
    Species.REPTILE -> R.string.species_reptile
    Species.HORSE -> R.string.species_horse
    Species.CHICKEN -> R.string.species_chicken
    Species.OTHER -> R.string.species_other
}

fun kindIcon(kind: NeedKind): Int = when (kind) {
    NeedKind.MEAL -> R.drawable.ic_bowl
    NeedKind.WALK -> R.drawable.ic_walk
    NeedKind.MEDICINE -> R.drawable.ic_pill
    NeedKind.CLEAN -> R.drawable.ic_box
    NeedKind.WATER -> R.drawable.ic_drop
    NeedKind.OTHER -> R.drawable.ic_dot
}

fun kindName(kind: NeedKind): Int = when (kind) {
    NeedKind.MEAL -> R.string.kind_meal
    NeedKind.WALK -> R.string.kind_walk
    NeedKind.MEDICINE -> R.string.kind_medicine
    NeedKind.CLEAN -> R.string.kind_clean
    NeedKind.WATER -> R.string.kind_water
    NeedKind.OTHER -> R.string.kind_other
}

/** Loads the owner's own picture of a pet from the app's files, off the main thread. */
@Composable
fun rememberPetPhoto(path: String?): ImageBitmap? {
    val bitmap by produceState<ImageBitmap?>(initialValue = null, path) {
        value = if (path == null) {
            null
        } else {
            withContext(Dispatchers.IO) { runCatching { BitmapFactory.decodeFile(path)?.asImageBitmap() }.getOrNull() }
        }
    }
    return bitmap
}

/** A round picture of a pet: the owner's photo, else the species picture, else a letter. */
@Composable
fun PetFace(name: String, species: Species, tint: Color, photoPath: String?, size: Dp, modifier: Modifier = Modifier) {
    val photo = rememberPetPhoto(photoPath)
    val art = speciesArt(species)
    when {
        photo != null -> Image(
            bitmap = photo,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.size(size).clip(CircleShape),
        )
        art != null -> Image(
            painter = painterResource(art),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.size(size).clip(CircleShape),
        )
        else -> Box(
            modifier = modifier.size(size).background(Brush.linearGradient(listOf(tint, tint.copy(alpha = 0.55f))), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                name.take(1).uppercase(),
                color = Tokens.Night,
                fontFamily = Bricolage,
                fontWeight = FontWeight.Bold,
                fontSize = (size.value * 0.42f).sp,
            )
        }
    }
}

/** The pet's picture inside a ring that fills as today's tasks get done. */
@Composable
fun PetPortrait(pet: Pet, done: Int, total: Int, size: Dp = 76.dp) {
    val tint = Color(pet.tint)
    val target = if (total == 0) 0f else done.toFloat() / total
    val progress by animateFloatAsState(target, spring(dampingRatio = 0.75f, stiffness = 140f), label = "petRing")
    Box(Modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            glowRing(progress = progress, stroke = (size.toPx() * 0.046f), brush = Brush.linearGradient(listOf(tint, tint)), glow = tint)
        }
        PetFace(pet.name, pet.species, tint, pet.photoPath, size * 0.76f)
    }
}

@Composable
fun MemberDot(member: Member, size: Dp = 28.dp) {
    Box(
        modifier = Modifier
            .size(size)
            .border(2.dp, Tokens.Night, CircleShape)
            .padding(2.dp)
            .background(Color(member.tint), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(member.name.take(1).uppercase(), style = MaterialTheme.typography.labelMedium, color = Tokens.Night)
    }
}

// ---- Controls ----

@Composable
fun CircleIconButton(icon: Int, label: String, onClick: () -> Unit, modifier: Modifier = Modifier, tint: Color = Tokens.Text) {
    Box(
        modifier = modifier.size(44.dp).glass(CircleShape).clickable(onClickLabel = label, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icon), contentDescription = label, tint = tint, modifier = Modifier.size(22.dp))
    }
}

@Composable
fun TopBar(title: String, onBack: () -> Unit, action: (@Composable () -> Unit)? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CircleIconButton(R.drawable.ic_back, stringResource(R.string.cd_back), onBack)
        Spacer(Modifier.width(12.dp))
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            color = Tokens.Text,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        if (action != null) {
            Spacer(Modifier.width(12.dp))
            action()
        }
    }
}

/** The one main action on a screen. */
@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(27.dp))
            .background(
                Brush.horizontalGradient(listOf(Tokens.Mint, Color(0xFF5BB0FF))),
                alpha = if (enabled) 1f else 0.35f,
            )
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = Tokens.Night, fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 17.sp)
    }
}

/** A quieter action. */
@Composable
fun GhostButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, color: Color = Tokens.Text, icon: Int? = null) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 50.dp)
            .glass(RoundedCornerShape(25.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
    ) {
        if (icon != null) {
            Icon(painterResource(icon), contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = color)
    }
}

/** A pill that is either picked or not. */
@Composable
fun SelectChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: Int? = null,
    accent: Color = Tokens.Mint,
) {
    val shape = RoundedCornerShape(22.dp)
    val base = modifier.heightIn(min = 44.dp)
    val styled = if (selected) {
        base.clip(shape).background(accent.copy(alpha = 0.20f)).border(1.5.dp, accent, shape)
    } else {
        base.glass(shape)
    }
    Row(
        modifier = styled.clickable(role = Role.RadioButton, onClick = onClick).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(painterResource(icon), contentDescription = null, tint = if (selected) accent else Tokens.TextMuted, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = if (selected) accent else Tokens.Text)
    }
}

@Composable
fun GlassField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.Sentences,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        shape = RoundedCornerShape(18.dp),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, capitalization = capitalization),
        textStyle = MaterialTheme.typography.bodyLarge,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = Tokens.Text,
            unfocusedTextColor = Tokens.Text,
            focusedContainerColor = Tokens.GlassBottom,
            unfocusedContainerColor = Tokens.GlassBottom,
            focusedBorderColor = Tokens.Mint,
            unfocusedBorderColor = Tokens.GlassEdgeTop,
            focusedLabelColor = Tokens.Mint,
            unfocusedLabelColor = Tokens.TextMuted,
            cursorColor = Tokens.Mint,
        ),
        modifier = modifier.fillMaxWidth(),
    )
}

/** Minus, a number, plus. */
@Composable
fun Stepper(value: Int, onChange: (Int) -> Unit, range: IntRange, modifier: Modifier = Modifier) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        CircleIconButton(R.drawable.ic_minus, stringResource(R.string.cd_less), { if (value > range.first) onChange(value - 1) })
        Text(
            value.toString(),
            color = Tokens.Text,
            fontFamily = Bricolage,
            fontWeight = FontWeight.Bold,
            fontSize = 24.sp,
            modifier = Modifier.width(64.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        CircleIconButton(R.drawable.ic_plus, stringResource(R.string.cd_more), { if (value < range.last) onChange(value + 1) })
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        color = Tokens.Text,
        modifier = modifier.padding(start = 6.dp, top = 6.dp),
    )
}

@Composable
fun Hint(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted, modifier = modifier.padding(horizontal = 6.dp))
}

/** A friendly card for a screen with nothing on it yet. */
@Composable
fun EmptyState(title: String, body: String, action: String? = null, onAction: (() -> Unit)? = null) {
    GlassCard {
        Text(title, style = MaterialTheme.typography.titleLarge, color = Tokens.Text)
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
        if (action != null && onAction != null) {
            Spacer(Modifier.height(16.dp))
            PrimaryButton(action, onAction)
        }
    }
}

@Composable
fun ConfirmDialog(
    title: String,
    text: String,
    confirm: String,
    dismiss: String,
    danger: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Tokens.NightRaised,
        titleContentColor = Tokens.Text,
        textContentColor = Tokens.Text,
        shape = RoundedCornerShape(28.dp),
        title = { Text(title, style = MaterialTheme.typography.titleLarge) },
        text = { Text(text, style = MaterialTheme.typography.bodyLarge) },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(contentColor = if (danger) Tokens.Alert else Tokens.Mint),
            ) { Text(confirm) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, colors = ButtonDefaults.textButtonColors(contentColor = Tokens.Text)) { Text(dismiss) }
        },
    )
}
