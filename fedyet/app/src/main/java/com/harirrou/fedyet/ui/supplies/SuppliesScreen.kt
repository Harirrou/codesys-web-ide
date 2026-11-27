package com.harirrou.fedyet.ui.supplies

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Supply
import com.harirrou.fedyet.engine.Supplies
import com.harirrou.fedyet.ui.WhenFormatter
import com.harirrou.fedyet.ui.amount
import com.harirrou.fedyet.ui.components.EmptyState
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.fadeTop
import com.harirrou.fedyet.ui.components.glass
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens
import java.time.Instant
import java.time.LocalDate

/** Whole days of stock left for a supply, or null when no task is linked to it. */
fun daysLeft(home: HomeSnapshot, supply: Supply): Int? {
    val need = supply.needId?.let(home::need) ?: return null
    return Supplies.daysLeft(supply.remaining, supply.perUse, Supplies.usesPerDay(need.schedule))
}

/** Food, litter and medicine across the home, the soonest to run out first. */
@Composable
fun SuppliesScreen(
    home: HomeSnapshot,
    now: Instant,
    padding: PaddingValues,
    onEdit: (String) -> Unit,
    onAdd: () -> Unit,
) {
    val context = LocalContext.current
    val formatter = remember(home.zone, now, context) { WhenFormatter(context, home.zone, now) }
    val today = now.atZone(home.zone).toLocalDate()
    val sorted = remember(home) { home.supplies.sortedBy { daysLeft(home, it) ?: Int.MAX_VALUE } }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(top = padding.calculateTopPadding()).fadeTop(),
        contentPadding = PaddingValues(
            start = 16.dp,
            end = 16.dp,
            top = 20.dp,
            bottom = padding.calculateBottomPadding() + 20.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item(key = "title") {
            Text(
                stringResource(R.string.supplies_title),
                style = MaterialTheme.typography.headlineLarge,
                color = Tokens.Text,
                modifier = Modifier.padding(horizontal = 6.dp),
            )
        }
        if (sorted.isEmpty()) {
            item(key = "empty") {
                EmptyState(
                    title = stringResource(R.string.supplies_empty_title),
                    body = stringResource(R.string.supplies_empty_body),
                    action = stringResource(R.string.supply_add),
                    onAction = onAdd,
                )
            }
        } else {
            items(sorted, key = { it.id }) { supply ->
                SupplyCard(home, supply, formatter, today, onClick = { onEdit(supply.id) })
            }
            item(key = "add") { GhostButton(stringResource(R.string.supply_add), onAdd, icon = R.drawable.ic_plus) }
        }
    }
}

/** One supply: how many days are left, a bar, and when to reorder. */
@Composable
fun SupplyCard(home: HomeSnapshot, supply: Supply, formatter: WhenFormatter, today: LocalDate, onClick: () -> Unit) {
    val days = daysLeft(home, supply)
    val need = supply.needId?.let(home::need)
    val pet = need?.let { home.pet(it.petId) }
    val color = when {
        days == null -> Tokens.TextMuted
        days <= 3 -> Tokens.Alert
        days <= 7 -> Tokens.Due
        else -> Tokens.Mint
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(24.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(supply.label, style = MaterialTheme.typography.titleLarge, color = Tokens.Text)
                Text(
                    stringResource(R.string.supply_left, amount(supply.remaining), supply.unit).trim(),
                    style = MaterialTheme.typography.bodySmall,
                    color = Tokens.TextMuted,
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(
                text = when {
                    days == null -> "–"
                    days == 0 -> stringResource(R.string.supply_empty_now)
                    else -> pluralStringResource(R.plurals.supply_days, days, days)
                },
                color = color,
                fontFamily = Bricolage,
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
            )
        }
        Spacer(Modifier.height(12.dp))
        // The bar is full at 30 days or more.
        val fraction = if (days == null) 0f else (days / 30f).coerceIn(0.02f, 1f)
        Box(Modifier.fillMaxWidth().height(8.dp).background(Tokens.Track, RoundedCornerShape(4.dp))) {
            Box(Modifier.fillMaxWidth(fraction).height(8.dp).background(color, RoundedCornerShape(4.dp)))
        }
        Spacer(Modifier.height(10.dp))
        Text(
            text = when {
                need == null || pet == null -> stringResource(R.string.supply_no_link)
                days != null && days <= 7 -> stringResource(
                    R.string.supply_order_by,
                    formatter.date(Supplies.orderBy(today.plusDays(days.toLong()), leadDays = 2).let { if (it.isBefore(today)) today else it }),
                    pet.name,
                    need.label,
                )
                else -> stringResource(R.string.supply_used_by, pet.name, need.label)
            },
            style = MaterialTheme.typography.bodySmall,
            color = if (days != null && days <= 7) color else Tokens.TextMuted,
        )
    }
}
