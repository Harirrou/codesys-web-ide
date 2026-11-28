package com.harirrou.fedyet.ui.pet

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.engine.DailySlot
import com.harirrou.fedyet.engine.Defaults
import com.harirrou.fedyet.engine.Guard
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Schedule
import com.harirrou.fedyet.ui.WhenFormatter
import com.harirrou.fedyet.ui.components.CircleIconButton
import com.harirrou.fedyet.ui.components.ConfirmDialog
import com.harirrou.fedyet.ui.components.DateDialog
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.GlassField
import com.harirrou.fedyet.ui.components.Hint
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.components.ScreenScaffold
import com.harirrou.fedyet.ui.components.SectionTitle
import com.harirrou.fedyet.ui.components.SelectChip
import com.harirrou.fedyet.ui.components.Stepper
import com.harirrou.fedyet.ui.components.TimeDialog
import com.harirrou.fedyet.ui.components.glass
import com.harirrou.fedyet.ui.components.kindIcon
import com.harirrou.fedyet.ui.components.kindName
import com.harirrou.fedyet.ui.theme.Tokens
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.UUID

private enum class Repeat { DAILY, EVERY_DAYS, MONTHLY, YEARLY, ONCE }

private fun repeatOf(schedule: Schedule?): Repeat = when (schedule) {
    is Schedule.EveryDays -> Repeat.EVERY_DAYS
    is Schedule.Monthly -> Repeat.MONTHLY
    is Schedule.Yearly -> Repeat.YEARLY
    is Schedule.Once -> Repeat.ONCE
    else -> Repeat.DAILY
}

private fun repeatName(repeat: Repeat): Int = when (repeat) {
    Repeat.DAILY -> R.string.repeat_daily
    Repeat.EVERY_DAYS -> R.string.repeat_every_days
    Repeat.MONTHLY -> R.string.repeat_monthly
    Repeat.YEARLY -> R.string.repeat_yearly
    Repeat.ONCE -> R.string.repeat_once
}

/** Add a task for a pet, or change one: what it is, when it repeats, and how hard to guard it. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NeedEditScreen(
    home: HomeSnapshot,
    petId: String,
    needId: String?,
    now: Instant,
    onBack: () -> Unit,
    onSave: (Need) -> Unit,
    onDelete: (String) -> Unit,
) {
    val pet = home.pet(petId) ?: return
    val existing = needId?.let(home::need)
    val context = LocalContext.current
    val formatter = remember(home.zone, now, context) { WhenFormatter(context, home.zone, now) }
    val today = remember { now.atZone(home.zone).toLocalDate() }
    val was = existing?.schedule

    var label by rememberSaveable { mutableStateOf(existing?.label.orEmpty()) }
    var kind by rememberSaveable { mutableStateOf(existing?.kind ?: NeedKind.MEAL) }
    var repeat by rememberSaveable { mutableStateOf(repeatOf(was)) }
    var chosenGuard by rememberSaveable { mutableStateOf(existing?.guard) }
    var active by rememberSaveable { mutableStateOf(existing?.active ?: true) }

    val slots = remember {
        mutableStateListOf<DailySlot>().apply {
            addAll((was as? Schedule.Daily)?.slots?.sortedBy { it.time } ?: listOf(DailySlot(LocalTime.of(8, 0))))
        }
    }
    var days by rememberSaveable { mutableIntStateOf((was as? Schedule.EveryDays)?.days ?: 3) }
    var dayOfMonth by rememberSaveable { mutableIntStateOf((was as? Schedule.Monthly)?.dayOfMonth ?: today.dayOfMonth) }
    var at by remember {
        mutableStateOf(
            when (was) {
                is Schedule.EveryDays -> was.at
                is Schedule.Monthly -> was.at
                is Schedule.Yearly -> was.at
                is Schedule.Once -> was.at.toLocalTime()
                else -> LocalTime.of(9, 0)
            },
        )
    }
    var date by remember {
        mutableStateOf(
            when (was) {
                is Schedule.Yearly -> LocalDate.of(today.year, was.month, minOf(was.dayOfMonth, 28))
                is Schedule.Once -> was.at.toLocalDate()
                else -> today
            },
        )
    }

    /** Which time is being edited: a slot's index, or -1 for the single time of the other repeats. */
    var editingTime by remember { mutableStateOf<Int?>(null) }
    var editingDate by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    val guard = chosenGuard ?: Defaults.guard(kind)
    val canSave = label.isNotBlank() && (repeat != Repeat.DAILY || slots.isNotEmpty())

    fun schedule(): Schedule = when (repeat) {
        Repeat.DAILY -> Schedule.Daily(slots.distinctBy { it.time }.sortedBy { it.time })
        Repeat.EVERY_DAYS -> Schedule.EveryDays(days, at, (was as? Schedule.EveryDays)?.firstDue)
        Repeat.MONTHLY -> Schedule.Monthly(dayOfMonth, at)
        Repeat.YEARLY -> Schedule.Yearly(date.monthValue, date.dayOfMonth, at)
        Repeat.ONCE -> Schedule.Once(LocalDateTime.of(date, at))
    }

    ScreenScaffold(
        title = stringResource(if (existing == null) R.string.need_new_title else R.string.need_edit_title, pet.name),
        onBack = onBack,
        bottom = {
            PrimaryButton(
                text = stringResource(R.string.action_save),
                enabled = canSave,
                onClick = {
                    onSave(
                        Need(
                            id = existing?.id ?: UUID.randomUUID().toString(),
                            petId = petId,
                            kind = kind,
                            label = label.trim(),
                            schedule = schedule(),
                            createdAt = existing?.createdAt ?: now,
                            guard = guard,
                            active = active,
                        ),
                    )
                },
            )
        },
    ) {
        GlassField(label, { label = it }, stringResource(R.string.need_label))

        SectionTitle(stringResource(R.string.need_kind))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            NeedKind.entries.forEach { option ->
                SelectChip(stringResource(kindName(option)), option == kind, { kind = option }, icon = kindIcon(option))
            }
        }

        SectionTitle(stringResource(R.string.need_repeat))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Repeat.entries.forEach { option ->
                SelectChip(stringResource(repeatName(option)), option == repeat, { repeat = option })
            }
        }

        GlassCard {
            when (repeat) {
                Repeat.DAILY -> {
                    slots.forEachIndexed { index, slot ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            ValueButton(formatter.time(slot.time), onClick = { editingTime = index }, modifier = Modifier.width(112.dp))
                            Spacer(Modifier.width(10.dp))
                            GlassField(
                                value = slot.label.orEmpty(),
                                onValueChange = { slots[index] = slot.copy(label = it.ifBlank { null }) },
                                label = stringResource(R.string.need_time_name),
                                modifier = Modifier.weight(1f),
                            )
                            if (slots.size > 1) {
                                Spacer(Modifier.width(8.dp))
                                CircleIconButton(R.drawable.ic_close, stringResource(R.string.cd_remove_time), { slots.removeAt(index) })
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    GhostButton(
                        text = stringResource(R.string.need_add_time),
                        icon = R.drawable.ic_plus,
                        onClick = {
                            val last = slots.maxOfOrNull { it.time } ?: LocalTime.of(8, 0)
                            slots.add(DailySlot(if (last.hour < 20) last.plusHours(4) else LocalTime.of(12, 0)))
                        },
                    )
                }
                Repeat.EVERY_DAYS -> {
                    LabelledRow(stringResource(R.string.need_every)) { Stepper(days, { days = it }, 1..365) }
                    Hint(context.resources.getQuantityString(R.plurals.need_days, days, days))
                    Spacer(Modifier.height(8.dp))
                    LabelledRow(stringResource(R.string.need_at)) { ValueButton(formatter.time(at), { editingTime = -1 }) }
                }
                Repeat.MONTHLY -> {
                    LabelledRow(stringResource(R.string.need_day_of_month)) { Stepper(dayOfMonth, { dayOfMonth = it }, 1..31) }
                    if (dayOfMonth > 28) Hint(stringResource(R.string.need_short_months))
                    Spacer(Modifier.height(8.dp))
                    LabelledRow(stringResource(R.string.need_at)) { ValueButton(formatter.time(at), { editingTime = -1 }) }
                }
                Repeat.YEARLY, Repeat.ONCE -> {
                    LabelledRow(stringResource(R.string.need_date)) { ValueButton(formatter.date(date), { editingDate = true }) }
                    Spacer(Modifier.height(8.dp))
                    LabelledRow(stringResource(R.string.need_at)) { ValueButton(formatter.time(at), { editingTime = -1 }) }
                }
            }
        }

        SectionTitle(stringResource(R.string.need_guard_title))
        Hint(stringResource(R.string.need_guard_hint))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SelectChip(stringResource(R.string.guard_none), guard == Guard.NONE, { chosenGuard = Guard.NONE })
            SelectChip(stringResource(R.string.guard_soft), guard == Guard.SOFT, { chosenGuard = Guard.SOFT }, accent = Tokens.Due)
            SelectChip(stringResource(R.string.guard_hard), guard == Guard.HARD, { chosenGuard = Guard.HARD }, accent = Tokens.Alert)
        }

        if (existing != null) {
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(R.string.need_pause), style = MaterialTheme.typography.titleMedium, color = Tokens.Text)
                        Text(stringResource(R.string.need_pause_hint), style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
                    }
                    Switch(
                        checked = !active,
                        onCheckedChange = { active = !it },
                        colors = SwitchDefaults.colors(checkedTrackColor = Tokens.Due, checkedThumbColor = Tokens.Night),
                    )
                }
            }
            GhostButton(stringResource(R.string.need_delete), { confirmDelete = true }, color = Tokens.Alert, icon = R.drawable.ic_trash)
        }
        Spacer(Modifier.height(8.dp))
    }

    editingTime?.let { index ->
        TimeDialog(
            initial = if (index >= 0) slots[index].time else at,
            onPick = { picked ->
                if (index >= 0) slots[index] = slots[index].copy(time = picked) else at = picked
                editingTime = null
            },
            onDismiss = { editingTime = null },
        )
    }
    if (editingDate) {
        DateDialog(
            initial = date,
            onPick = {
                date = it
                editingDate = false
            },
            onDismiss = { editingDate = false },
        )
    }
    if (confirmDelete && existing != null) {
        ConfirmDialog(
            title = stringResource(R.string.need_delete_title, existing.label),
            text = stringResource(R.string.need_delete_text),
            confirm = stringResource(R.string.action_delete),
            dismiss = stringResource(R.string.action_cancel),
            danger = true,
            onConfirm = {
                confirmDelete = false
                onDelete(existing.id)
            },
            onDismiss = { confirmDelete = false },
        )
    }
}

@Composable
private fun LabelledRow(label: String, content: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.titleMedium, color = Tokens.Text, modifier = Modifier.weight(1f))
        content()
    }
}

/** A value that opens a picker when tapped, such as a time or a date. */
@Composable
private fun ValueButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .heightIn(min = 48.dp)
            .glass(RoundedCornerShape(16.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(text, style = MaterialTheme.typography.titleMedium, color = Tokens.Mint)
    }
}
