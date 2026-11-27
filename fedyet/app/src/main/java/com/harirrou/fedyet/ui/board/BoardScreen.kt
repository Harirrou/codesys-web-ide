package com.harirrou.fedyet.ui.board

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Member
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.engine.GuardReason
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Status
import com.harirrou.fedyet.ui.theme.Ambient
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens
import com.harirrou.fedyet.ui.theme.ambientFor
import kotlinx.coroutines.launch

@Composable
fun BoardScreen(viewModel: BoardViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(viewModel) {
        viewModel.events.collect { event ->
            when (event) {
                is BoardEvent.Logged -> launch {
                    snackbar.currentSnackbarData?.dismiss()
                    val result = snackbar.showSnackbar(
                        message = context.getString(R.string.snack_logged, event.title, event.petName),
                        actionLabel = context.getString(R.string.snack_undo),
                        duration = SnackbarDuration.Short,
                    )
                    if (result == SnackbarResult.ActionPerformed) viewModel.undo(event.logId)
                }
            }
        }
    }

    val home = state.home
    val board = state.board
    val hour = if (home != null) state.now.atZone(home.zone).hour else 12
    val ambient = ambientFor(hour)

    AmbientBackground(ambient) {
        Scaffold(
            containerColor = Color.Transparent,
            snackbarHost = {
                SnackbarHost(snackbar) { data ->
                    Snackbar(
                        snackbarData = data,
                        containerColor = Tokens.NightRaised,
                        contentColor = Tokens.Text,
                        actionColor = Tokens.Due,
                        shape = RoundedCornerShape(18.dp),
                    )
                }
            },
        ) { insets ->
            if (home == null || board == null) {
                Box(Modifier.fillMaxSize().padding(insets))
                return@Scaffold
            }
            val formatter = remember(home.zone, state.now, context) { WhenFormatter(context, home.zone, state.now) }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = 16.dp,
                    end = 16.dp,
                    top = insets.calculateTopPadding() + 20.dp,
                    bottom = insets.calculateBottomPadding() + 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item(key = "hero") { Hero(home, board, hour, formatter.header(state.now), ambient) }
                item(key = "notice") { SampleNotice() }
                items(board.pets, key = { it.pet.id }) { card ->
                    PetCard(card, home, formatter, onRowTapped = viewModel::onRowTapped)
                }
            }
        }
    }

    state.prompt?.let { prompt ->
        val promptHome = state.home ?: return@let
        GuardDialog(
            prompt = prompt,
            who = whoName(promptHome, prompt.previousById),
            at = WhenFormatter(context, promptHome.zone, state.now).moment(prompt.previousAt),
            onConfirm = viewModel::confirmPrompt,
            onDismiss = viewModel::dismissPrompt,
        )
    }
}

// ---- Atmosphere ----

/** The night ground with two soft glows at the top whose colours follow the time of day. */
@Composable
private fun AmbientBackground(ambient: Ambient, content: @Composable () -> Unit) {
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
private fun Modifier.glass(shape: Shape, glow: Color? = null): Modifier = this
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
private fun DrawScope.glowRing(progress: Float, stroke: Float, brush: Brush, glow: Color) {
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

// ---- Top of the screen ----

@Composable
private fun whoName(home: HomeSnapshot, memberId: String): String =
    if (memberId == home.meId) stringResource(R.string.who_you) else home.member(memberId)?.name ?: "?"

@Composable
private fun Hero(home: HomeSnapshot, board: BoardUi, hour: Int, dateLine: String, ambient: Ambient) {
    val done = board.pets.sumOf { it.doneCount }
    val left = board.pets.sumOf { it.dueCount }
    val greeting = stringResource(
        when (hour) {
            in 5..11 -> R.string.greeting_morning
            in 12..16 -> R.string.greeting_afternoon
            in 17..21 -> R.string.greeting_evening
            else -> R.string.greeting_night
        },
    )
    val headline = when {
        left > 0 -> pluralStringResource(R.plurals.hero_left, left, left)
        done > 0 -> stringResource(R.string.hero_all_done)
        else -> stringResource(R.string.hero_nothing_due)
    }

    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(greeting, style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
            Text(headline, style = MaterialTheme.typography.headlineLarge, color = Tokens.Text)
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy((-7).dp)) {
                    home.members.forEach { member -> MemberDot(member) }
                }
                Spacer(Modifier.width(10.dp))
                Text(dateLine, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
            }
        }
        Spacer(Modifier.width(12.dp))
        DayRing(done, done + left, ambient)
    }
}

@Composable
private fun DayRing(done: Int, total: Int, ambient: Ambient) {
    val target = if (total == 0) 0f else done.toFloat() / total
    val progress by animateFloatAsState(target, spring(dampingRatio = 0.8f, stiffness = 120f), label = "dayRing")
    val description = stringResource(R.string.hero_ring, done, total)
    Box(
        modifier = Modifier.size(84.dp).semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            glowRing(
                progress = progress,
                stroke = 7.dp.toPx(),
                brush = Brush.sweepGradient(listOf(ambient.near, ambient.far, ambient.near)),
                glow = ambient.near,
            )
        }
        Text(
            text = "$done/$total",
            color = Tokens.Text,
            fontFamily = Bricolage,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
    }
}

@Composable
private fun MemberDot(member: Member) {
    Box(
        modifier = Modifier
            .size(28.dp)
            .border(2.dp, Tokens.Night, CircleShape)
            .padding(2.dp)
            .background(Color(member.tint), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(member.name.take(1).uppercase(), style = MaterialTheme.typography.labelMedium, color = Tokens.Night)
    }
}

@Composable
private fun SampleNotice() {
    Text(
        text = stringResource(R.string.board_sample_notice),
        style = MaterialTheme.typography.bodySmall,
        color = Tokens.TextMuted,
        modifier = Modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

// ---- Pet cards ----

@Composable
private fun PetCard(
    card: PetCardUi,
    home: HomeSnapshot,
    formatter: WhenFormatter,
    onRowTapped: (String) -> Unit,
) {
    val tint = Color(card.pet.tint)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(28.dp), glow = tint)
            .padding(top = 16.dp, bottom = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PetPortrait(card.pet, done = card.doneCount, total = card.doneCount + card.dueCount)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(card.pet.name, style = MaterialTheme.typography.titleLarge, color = Tokens.Text)
                Text(card.pet.detail, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(card)
        }
        card.rows.forEach { row ->
            key(row.needId) {
                HorizontalDivider(color = Tokens.Hairline, modifier = Modifier.padding(horizontal = 16.dp))
                NeedRow(row, statusText(row, home, formatter), tint, onClick = { onRowTapped(row.needId) })
            }
        }
    }
}

/** The pet's picture inside a ring that fills as today's tasks get done. */
@Composable
private fun PetPortrait(pet: Pet, done: Int, total: Int) {
    val tint = Color(pet.tint)
    val target = if (total == 0) 0f else done.toFloat() / total
    val progress by animateFloatAsState(target, spring(dampingRatio = 0.75f, stiffness = 140f), label = "petRing")
    Box(Modifier.size(76.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            glowRing(progress = progress, stroke = 3.5.dp.toPx(), brush = Brush.linearGradient(listOf(tint, tint)), glow = tint)
        }
        val art = artFor(pet.species)
        if (art != null) {
            Image(
                painter = painterResource(art),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(58.dp).clip(CircleShape),
            )
        } else {
            Box(
                modifier = Modifier
                    .size(58.dp)
                    .background(Brush.linearGradient(listOf(tint, tint.copy(alpha = 0.55f))), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    pet.name.take(1).uppercase(),
                    color = Tokens.Night,
                    fontFamily = Bricolage,
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                )
            }
        }
    }
}

private fun artFor(species: Species): Int? = when (species) {
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

@Composable
private fun StatusPill(card: PetCardUi) {
    val due = card.dueCount > 0
    val text = when {
        due -> pluralStringResource(R.plurals.pill_due, card.dueCount, card.dueCount)
        card.doneCount > 0 -> stringResource(R.string.pill_all_done)
        else -> stringResource(R.string.pill_nothing_due)
    }
    val color = when {
        due -> Tokens.Due
        card.doneCount > 0 -> Tokens.Mint
        else -> Tokens.TextMuted
    }
    Text(
        text = text,
        style = MaterialTheme.typography.labelMedium,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.16f), RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

@Composable
private fun statusText(row: NeedRowUi, home: HomeSnapshot, formatter: WhenFormatter): String =
    when (val line = row.line) {
        is StatusLine.Done -> {
            val whenDone = formatter.moment(line.at)
            val who = whoName(home, line.byId)
            when {
                row.doneTwice -> stringResource(R.string.status_done_twice, whenDone, who)
                line.next != null -> stringResource(R.string.status_done_next, whenDone, who, formatter.day(line.next))
                else -> stringResource(R.string.status_done, whenDone, who)
            }
        }
        is StatusLine.DueAt -> {
            val sameDay = formatter.moment(line.due) == formatter.time(line.due)
            if (sameDay) {
                stringResource(R.string.status_due_at, formatter.time(line.due))
            } else {
                stringResource(R.string.status_due_on, formatter.day(line.due))
            }
        }
        is StatusLine.DueNow -> stringResource(R.string.status_due_now, formatter.time(line.due))
        is StatusLine.Overdue -> stringResource(R.string.status_overdue, formatter.moment(line.due))
        is StatusLine.Next -> when {
            line.due == null -> ""
            line.everyDays != null ->
                pluralStringResource(R.plurals.status_next_every, line.everyDays, formatter.day(line.due), line.everyDays)
            else -> stringResource(R.string.status_next, formatter.day(line.due))
        }
    }

@Composable
private fun NeedRow(row: NeedRowUi, status: String, tint: Color, onClick: () -> Unit) {
    val haptics = LocalHapticFeedback.current
    val done = row.status == Status.DONE
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 62.dp)
            .clickable(role = Role.Button) {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            }
            .padding(horizontal = 16.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(38.dp).background(Color(0x12FFFFFF), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painter = painterResource(iconFor(row.kind)),
                contentDescription = null,
                tint = if (done) tint else Tokens.TextMuted,
                modifier = Modifier.size(21.dp),
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(row.title, style = MaterialTheme.typography.titleMedium, color = Tokens.Text)
            Text(
                text = status,
                style = MaterialTheme.typography.bodySmall,
                color = when {
                    row.doneTwice -> Tokens.Alert
                    row.status == Status.DUE -> Tokens.Due
                    row.status == Status.OVERDUE -> Tokens.Alert
                    else -> Tokens.TextMuted
                },
            )
        }
        Spacer(Modifier.width(12.dp))
        CheckMark(row.status, tint)
    }
}

/**
 * The round mark at the end of a row. When a task has just been ticked it pops in with a
 * spring and sends one ring outward; a task that was already done when the screen opened
 * does not animate.
 */
@Composable
private fun CheckMark(status: Status, tint: Color) {
    val done = status == Status.DONE
    val scale = remember { Animatable(1f) }
    val pulse = remember { Animatable(1f) }
    var wasDone by remember { mutableStateOf(done) }

    LaunchedEffect(done) {
        if (done && !wasDone) {
            launch {
                scale.snapTo(0.5f)
                scale.animateTo(1f, spring(dampingRatio = 0.42f, stiffness = 380f))
            }
            launch {
                pulse.snapTo(0f)
                pulse.animateTo(1f, tween(durationMillis = 700, easing = FastOutSlowInEasing))
            }
        }
        wasDone = done
    }

    val size: Dp = 34.dp
    when (status) {
        Status.DONE -> Box(
            modifier = Modifier
                .size(size)
                .drawBehind {
                    val radius = this.size.minDimension / 2f
                    // A soft halo, and the one-off ring that travels outward after a tick.
                    drawCircle(
                        Brush.radialGradient(listOf(tint.copy(alpha = 0.45f), Color.Transparent), radius = radius * 2.1f),
                        radius = radius * 2.1f,
                    )
                    val travel = pulse.value
                    if (travel < 1f) {
                        drawCircle(
                            color = tint.copy(alpha = (1f - travel) * 0.6f),
                            radius = radius * (1f + travel * 0.9f),
                            style = Stroke(width = 2.dp.toPx()),
                        )
                    }
                }
                .graphicsLayer {
                    scaleX = scale.value
                    scaleY = scale.value
                }
                .background(Brush.linearGradient(listOf(Color.White.copy(alpha = 0.92f), tint)), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_check),
                contentDescription = stringResource(R.string.cd_done),
                tint = Tokens.Night,
                modifier = Modifier.size(19.dp),
            )
        }
        Status.DUE, Status.OVERDUE -> {
            val color = if (status == Status.OVERDUE) Tokens.Alert else Tokens.Due
            Box(
                Modifier
                    .size(size)
                    .background(color.copy(alpha = 0.10f), CircleShape)
                    .border(2.dp, color, CircleShape),
            )
        }
        Status.NOT_DUE -> Box(
            Modifier.size(size).drawBehind {
                val stroke = 2.dp.toPx()
                drawCircle(
                    color = Tokens.TextMuted.copy(alpha = 0.55f),
                    radius = (this.size.minDimension - stroke) / 2f,
                    style = Stroke(width = stroke, pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))),
                )
            },
        )
    }
}

private fun iconFor(kind: NeedKind): Int = when (kind) {
    NeedKind.MEAL -> R.drawable.ic_bowl
    NeedKind.WALK -> R.drawable.ic_walk
    NeedKind.MEDICINE -> R.drawable.ic_pill
    NeedKind.CLEAN -> R.drawable.ic_box
    NeedKind.WATER -> R.drawable.ic_drop
    NeedKind.OTHER -> R.drawable.ic_dot
}

// ---- "Already done?" ----

@Composable
private fun GuardDialog(
    prompt: GuardPrompt,
    who: String,
    at: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    var checked by remember(prompt) { mutableStateOf(false) }
    val already = prompt.reason == GuardReason.ALREADY_DONE

    val title = when {
        !prompt.hard -> stringResource(R.string.guard_soft_title)
        already -> stringResource(R.string.guard_hard_title_already)
        else -> stringResource(R.string.guard_hard_title_too_soon)
    }
    val message = when {
        prompt.hard && already -> stringResource(R.string.guard_hard_already, who, prompt.petName, at)
        prompt.hard -> stringResource(R.string.guard_hard_too_soon, who, prompt.petName, at)
        already -> stringResource(R.string.guard_soft_already, who, prompt.petName, at)
        else -> stringResource(R.string.guard_soft_too_soon, who, prompt.petName, at)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Tokens.NightRaised,
        titleContentColor = Tokens.Text,
        textContentColor = Tokens.Text,
        shape = RoundedCornerShape(28.dp),
        title = { Text(title, style = MaterialTheme.typography.titleLarge) },
        text = {
            Column {
                Text(message, style = MaterialTheme.typography.bodyLarge)
                if (prompt.hard) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 14.dp)
                            .clickable(role = Role.Checkbox) { checked = !checked },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(checked = checked, onCheckedChange = null)
                        Spacer(Modifier.width(10.dp))
                        Text(
                            stringResource(R.string.guard_hard_check),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Tokens.TextMuted,
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                enabled = !prompt.hard || checked,
                colors = ButtonDefaults.textButtonColors(contentColor = if (prompt.hard) Tokens.Alert else Tokens.Due),
            ) {
                Text(stringResource(if (prompt.hard) R.string.guard_give_again else R.string.guard_log_again))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, colors = ButtonDefaults.textButtonColors(contentColor = Tokens.Text)) {
                Text(stringResource(if (prompt.hard) R.string.guard_dont_give else R.string.guard_cancel))
            }
        },
    )
}
