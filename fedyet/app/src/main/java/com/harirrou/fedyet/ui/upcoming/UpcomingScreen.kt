package com.harirrou.fedyet.ui.upcoming

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.ui.WhenFormatter
import com.harirrou.fedyet.ui.components.EmptyState
import com.harirrou.fedyet.ui.components.PetFace
import com.harirrou.fedyet.ui.components.SectionTitle
import com.harirrou.fedyet.ui.components.fadeTop
import com.harirrou.fedyet.ui.components.glass
import com.harirrou.fedyet.ui.theme.Tokens
import java.time.Instant

/** Everything due in the next 30 days, grouped by day, overdue first. */
@Composable
fun UpcomingScreen(home: HomeSnapshot, now: Instant, padding: PaddingValues, onPet: (String) -> Unit) {
    val context = LocalContext.current
    val formatter = remember(home.zone, now, context) { WhenFormatter(context, home.zone, now) }
    val items = remember(home, now) { UpcomingPresenter.present(home, now) }
    val overdueTitle = stringResource(R.string.upcoming_overdue)
    val groups = remember(items, formatter) {
        items.groupBy { if (it.overdue) overdueTitle else formatter.dayHeading(it.dueAt) }.toList()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(top = padding.calculateTopPadding()).fadeTop(),
        contentPadding = PaddingValues(
            start = 16.dp,
            end = 16.dp,
            top = 20.dp,
            bottom = padding.calculateBottomPadding() + 20.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item(key = "title") {
            Text(
                stringResource(R.string.upcoming_title),
                style = MaterialTheme.typography.headlineLarge,
                color = Tokens.Text,
                modifier = Modifier.padding(horizontal = 6.dp),
            )
        }
        if (items.isEmpty()) {
            item(key = "empty") {
                EmptyState(stringResource(R.string.upcoming_empty_title), stringResource(R.string.upcoming_empty_body))
            }
        }
        groups.forEach { (heading, group) ->
            item(key = "h-$heading") { SectionTitle(heading) }
            items(group, key = { it.needId }) { item ->
                val line = when {
                    item.overdue -> formatter.moment(item.dueAt)
                    item.dueNow -> stringResource(R.string.upcoming_due_now)
                    else -> formatter.time(item.dueAt)
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .glass(RoundedCornerShape(20.dp), glow = Color(item.pet.tint))
                        .clickable(role = Role.Button) { onPet(item.pet.id) }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PetFace(item.pet.name, item.pet.species, Color(item.pet.tint), item.pet.photoPath, 44.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(item.title, style = MaterialTheme.typography.titleMedium, color = Tokens.Text)
                        Text(item.pet.name, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
                    }
                    Text(
                        line,
                        style = MaterialTheme.typography.labelLarge,
                        color = when {
                            item.overdue -> Tokens.Alert
                            item.dueNow -> Tokens.Due
                            else -> Tokens.Text
                        },
                    )
                }
            }
        }
    }
}
