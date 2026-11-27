package com.harirrou.fedyet.ui.board

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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Member
import com.harirrou.fedyet.engine.GuardReason
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Status
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens
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

    Scaffold(
        containerColor = Tokens.Ground,
        snackbarHost = { SnackbarHost(snackbar) },
    ) { insets ->
        val home = state.home
        val board = state.board
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
                top = insets.calculateTopPadding() + 16.dp,
                bottom = insets.calculateBottomPadding() + 24.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item(key = "header") { Header(home, formatter.header(state.now)) }
            item(key = "notice") { SampleNotice() }
            items(board.pets, key = { it.pet.id }) { card ->
                PetCard(card, home, formatter, onRowTapped = viewModel::onRowTapped)
            }
        }
    }

    state.prompt?.let { prompt ->
        val home = state.home ?: return@let
        GuardDialog(
            prompt = prompt,
            who = whoName(home, prompt.previousById),
            at = WhenFormatter(context, home.zone, state.now).moment(prompt.previousAt),
            onConfirm = viewModel::confirmPrompt,
            onDismiss = viewModel::dismissPrompt,
        )
    }
}

@Composable
private fun whoName(home: HomeSnapshot, memberId: String): String =
    if (memberId == home.meId) stringResource(R.string.who_you) else home.member(memberId)?.name ?: "?"

@Composable
private fun Header(home: HomeSnapshot, dateLine: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(Modifier.weight(1f)) {
            Text(dateLine, style = MaterialTheme.typography.bodySmall, color = Tokens.Muted)
            Text(stringResource(R.string.board_title), style = MaterialTheme.typography.headlineLarge)
        }
        Row(horizontalArrangement = Arrangement.spacedBy((-8).dp)) {
            home.members.forEach { member -> MemberDot(member) }
        }
    }
}

@Composable
private fun MemberDot(member: Member, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(32.dp)
            .border(2.dp, Tokens.Ground, CircleShape)
            .padding(2.dp)
            .background(Color(member.tint), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(member.name.take(1).uppercase(), style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun SampleNotice() {
    Text(
        text = stringResource(R.string.board_sample_notice),
        style = MaterialTheme.typography.bodySmall,
        color = Tokens.Muted,
        modifier = Modifier
            .fillMaxWidth()
            .background(Tokens.Notice, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

@Composable
private fun PetCard(
    card: PetCardUi,
    home: HomeSnapshot,
    formatter: WhenFormatter,
    onRowTapped: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Tokens.Card, RoundedCornerShape(20.dp))
            .border(1.dp, Tokens.CardBorder, RoundedCornerShape(20.dp))
            .padding(top = 14.dp, bottom = 6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 14.dp, end = 14.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(44.dp).background(Color(card.pet.tint), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    card.pet.name.take(1).uppercase(),
                    color = Color.White,
                    fontFamily = Bricolage,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(card.pet.name, style = MaterialTheme.typography.titleLarge)
                Text(card.pet.detail, style = MaterialTheme.typography.bodySmall, color = Tokens.Muted)
            }
            StatusPill(card)
        }
        card.rows.forEach { row ->
            HorizontalDivider(color = Tokens.RowDivider, modifier = Modifier.padding(horizontal = 14.dp))
            NeedRow(row, statusText(row, home, formatter), onClick = { onRowTapped(row.needId) })
        }
    }
}

@Composable
private fun StatusPill(card: PetCardUi) {
    val due = card.dueCount > 0
    val text = when {
        due -> pluralStringResource(R.plurals.pill_due, card.dueCount, card.dueCount)
        card.doneCount > 0 -> stringResource(R.string.pill_all_done)
        else -> stringResource(R.string.pill_nothing_due)
    }
    Text(
        text = text,
        style = MaterialTheme.typography.labelMedium,
        color = if (due) Tokens.DuePillText else Tokens.Spruce,
        modifier = Modifier
            .background(if (due) Tokens.DuePill else Tokens.SprucePill, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
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
private fun NeedRow(row: NeedRowUi, status: String, onClick: () -> Unit) {
    val haptics = LocalHapticFeedback.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(role = Role.Button) {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            }
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            painter = painterResource(iconFor(row.kind)),
            contentDescription = null,
            tint = Tokens.Muted,
            modifier = Modifier.size(22.dp),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(row.title, style = MaterialTheme.typography.titleMedium)
            Text(
                text = status,
                style = MaterialTheme.typography.bodySmall,
                color = when {
                    row.doneTwice -> Tokens.Alert
                    row.status == Status.DUE -> Tokens.DueText
                    row.status == Status.OVERDUE -> Tokens.Alert
                    else -> Tokens.Muted
                },
            )
        }
        Spacer(Modifier.width(12.dp))
        CheckMark(row.status)
    }
}

@Composable
private fun CheckMark(status: Status) {
    val shape = Modifier.size(32.dp)
    when (status) {
        Status.DONE -> Box(shape.clip(CircleShape).background(Tokens.Spruce), contentAlignment = Alignment.Center) {
            Icon(
                painter = painterResource(R.drawable.ic_check),
                contentDescription = stringResource(R.string.cd_done),
                tint = Color.White,
                modifier = Modifier.size(18.dp),
            )
        }
        Status.DUE, Status.OVERDUE -> Box(
            shape.border(2.dp, if (status == Status.OVERDUE) Tokens.Alert else Tokens.Ring, CircleShape),
        )
        Status.NOT_DUE -> Box(
            shape.drawBehind {
                val stroke = 2.dp.toPx()
                drawCircle(
                    color = Tokens.Ring,
                    radius = (size.minDimension - stroke) / 2f,
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
        title = { Text(title, style = MaterialTheme.typography.titleLarge) },
        text = {
            Column {
                Text(message, style = MaterialTheme.typography.bodyLarge)
                if (prompt.hard) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                            .clickable(role = Role.Checkbox) { checked = !checked },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(checked = checked, onCheckedChange = null)
                        Spacer(Modifier.width(10.dp))
                        Text(stringResource(R.string.guard_hard_check), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = !prompt.hard || checked) {
                Text(stringResource(if (prompt.hard) R.string.guard_give_again else R.string.guard_log_again))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(if (prompt.hard) R.string.guard_dont_give else R.string.guard_cancel))
            }
        },
    )
}
