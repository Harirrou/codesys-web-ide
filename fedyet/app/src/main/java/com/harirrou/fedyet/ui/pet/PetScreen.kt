package com.harirrou.fedyet.ui.pet

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.Status
import com.harirrou.fedyet.ui.WhenFormatter
import com.harirrou.fedyet.ui.board.BoardPresenter
import com.harirrou.fedyet.ui.components.CircleIconButton
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.Hint
import com.harirrou.fedyet.ui.components.PetPortrait
import com.harirrou.fedyet.ui.components.ScreenScaffold
import com.harirrou.fedyet.ui.components.SectionTitle
import com.harirrou.fedyet.ui.components.kindIcon
import com.harirrou.fedyet.ui.supplies.SupplyCard
import com.harirrou.fedyet.ui.theme.Tokens
import java.time.Instant

/** One pet: what happened today and who did it, its tasks, and what is running low. */
@Composable
fun PetScreen(
    home: HomeSnapshot,
    petId: String,
    now: Instant,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onAddNeed: () -> Unit,
    onEditNeed: (String) -> Unit,
    onUndo: (String) -> Unit,
    onEditSupply: (String) -> Unit,
) {
    val pet = home.pet(petId) ?: return
    val context = LocalContext.current
    val formatter = remember(home.zone, now, context) { WhenFormatter(context, home.zone, now) }
    val needs = home.needs.filter { it.petId == petId }
    val needIds = needs.map { it.id }.toSet()
    val today = now.atZone(home.zone).toLocalDate()
    val todaysLogs = home.logs
        .filter { it.needId in needIds && !it.undone && it.at.atZone(home.zone).toLocalDate() == today }
        .sortedBy { it.at }
    val card = BoardPresenter.present(home, now).pets.firstOrNull { it.pet.id == petId }
    val done = card?.rows?.count { it.status == Status.DONE } ?: 0
    val due = card?.dueCount ?: 0
    val supplies = home.supplies.filter { it.needId in needIds }

    ScreenScaffold(
        title = pet.name,
        onBack = onBack,
        action = { CircleIconButton(R.drawable.ic_edit, stringResource(R.string.pet_edit_title), onEdit) },
    ) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            PetPortrait(pet, done = done, total = done + due, size = 132.dp)
            Spacer(Modifier.height(10.dp))
            Text(pet.name, style = MaterialTheme.typography.headlineLarge, color = Tokens.Text)
            if (pet.detail.isNotBlank()) {
                Text(pet.detail, style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
            }
        }

        SectionTitle(stringResource(R.string.pet_today))
        GlassCard(glow = Color(pet.tint)) {
            if (todaysLogs.isEmpty()) {
                Text(stringResource(R.string.pet_nothing_logged), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
            } else {
                DayTimeline(home, todaysLogs)
                Spacer(Modifier.height(8.dp))
                todaysLogs.forEachIndexed { index, log ->
                    if (index > 0) HorizontalDivider(color = Tokens.Hairline)
                    LogRow(home, log, needs, formatter, onUndo = { onUndo(log.id) })
                }
            }
        }

        SectionTitle(stringResource(R.string.pet_tasks))
        if (needs.isNotEmpty()) {
            GlassCard {
                needs.forEachIndexed { index, need ->
                    if (index > 0) HorizontalDivider(color = Tokens.Hairline)
                    TaskRow(need, formatter.schedule(need.schedule), onClick = { onEditNeed(need.id) })
                }
            }
        }
        GhostButton(stringResource(R.string.need_add), onAddNeed, icon = R.drawable.ic_plus)

        if (supplies.isNotEmpty()) {
            SectionTitle(stringResource(R.string.pet_supplies))
            supplies.forEach { supply -> SupplyCard(home, supply, formatter, today, onClick = { onEditSupply(supply.id) }) }
        }
        Spacer(Modifier.height(8.dp))
    }
}

/** Today from midnight to midnight, with a dot for each thing done, in the colour of who did it. */
@Composable
private fun DayTimeline(home: HomeSnapshot, logs: List<LogEntry>) {
    val dot = 26.dp
    BoxWithConstraints(Modifier.fillMaxWidth().height(34.dp)) {
        val track = maxWidth - dot
        Box(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = dot / 2)
                .height(2.dp)
                .align(Alignment.CenterStart)
                .background(Tokens.Track, RoundedCornerShape(1.dp)),
        )
        logs.forEach { log ->
            val local = log.at.atZone(home.zone)
            val fraction = (local.hour * 60 + local.minute) / 1440f
            val member = home.member(log.by)
            Box(
                modifier = Modifier
                    .offset(x = track * fraction)
                    .align(Alignment.CenterStart)
                    .size(dot)
                    .background(Tokens.Night, CircleShape)
                    .padding(2.dp)
                    .background(Color(member?.tint ?: 0xFFA9B4C6), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    (member?.name ?: "?").take(1).uppercase(),
                    style = MaterialTheme.typography.labelMedium,
                    color = Tokens.Night,
                )
            }
        }
    }
    Row(Modifier.fillMaxWidth()) {
        Hint(stringResource(R.string.timeline_start), Modifier.weight(1f))
        Hint(stringResource(R.string.timeline_end))
    }
}

@Composable
private fun LogRow(home: HomeSnapshot, log: LogEntry, needs: List<Need>, formatter: WhenFormatter, onUndo: () -> Unit) {
    val need = needs.firstOrNull { it.id == log.needId }
    val who = if (log.by == home.meId) stringResource(R.string.who_you) else home.member(log.by)?.name ?: "?"
    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(formatter.time(log.at), style = MaterialTheme.typography.titleMedium, color = Tokens.Text, modifier = Modifier.width(84.dp))
        Column(Modifier.weight(1f)) {
            Text(need?.label.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = Tokens.Text)
            Text(who, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
        }
        Text(
            stringResource(R.string.snack_undo),
            style = MaterialTheme.typography.labelLarge,
            color = Tokens.Due,
            modifier = Modifier.clickable(role = Role.Button, onClick = onUndo).padding(horizontal = 8.dp, vertical = 14.dp),
        )
    }
}

@Composable
private fun TaskRow(need: Need, summary: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable(role = Role.Button, onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(38.dp).background(Color(0x12FFFFFF), CircleShape), contentAlignment = Alignment.Center) {
            Icon(painterResource(kindIcon(need.kind)), contentDescription = null, tint = Tokens.TextMuted, modifier = Modifier.size(21.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(need.label, style = MaterialTheme.typography.titleMedium, color = Tokens.Text)
            Text(
                if (need.active) summary else stringResource(R.string.need_paused),
                style = MaterialTheme.typography.bodySmall,
                color = if (need.active) Tokens.TextMuted else Tokens.Due,
            )
        }
        Icon(painterResource(R.drawable.ic_chevron), contentDescription = null, tint = Tokens.TextMuted, modifier = Modifier.size(20.dp))
    }
}
