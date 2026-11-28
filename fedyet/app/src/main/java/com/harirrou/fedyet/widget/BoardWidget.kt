package com.harirrou.fedyet.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.harirrou.fedyet.FedYetApp
import com.harirrou.fedyet.MainActivity
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.engine.GuardVerdict
import com.harirrou.fedyet.engine.NeedsEngine
import com.harirrou.fedyet.ui.WhenFormatter
import com.harirrou.fedyet.ui.upcoming.UpcomingItem
import com.harirrou.fedyet.ui.upcoming.UpcomingPresenter
import java.time.Instant
import kotlinx.coroutines.flow.first

private val Text0 = ColorProvider(Color(0xFFF2F5FA))
private val Muted = ColorProvider(Color(0xFFA9B4C6))
private val Due = ColorProvider(Color(0xFFF5B94A))
private val Alert = ColorProvider(Color(0xFFFF8571))
private val Mint = ColorProvider(Color(0xFF6EE7B7))

/**
 * The home-screen widget: what is waiting and what comes next, with a tick button on
 * anything due. It reads the same home as the app and is redrawn whenever the home changes
 * or a task becomes due.
 */
class BoardWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val container = (context.applicationContext as FedYetApp).container
        container.homeRepository.ready.first { it }
        provideContent {
            val home by container.homeRepository.home.collectAsState()
            Content(context, home, container.clock())
        }
    }

    companion object {
        suspend fun refresh(context: Context) {
            runCatching { BoardWidget().updateAll(context) }
        }
    }
}

class BoardWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BoardWidget()
}

@Composable
private fun Content(context: Context, home: HomeSnapshot?, now: Instant) {
    val openApp = actionStartActivity<MainActivity>()
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.widget_background))
            .padding(14.dp)
            .clickable(openApp),
    ) {
        if (home == null) {
            Text(context.getString(R.string.app_name), style = TextStyle(color = Text0, fontSize = 16.sp, fontWeight = FontWeight.Bold))
            Spacer(GlanceModifier.height(6.dp))
            Text(context.getString(R.string.widget_setup), style = TextStyle(color = Muted, fontSize = 13.sp))
            return@Column
        }

        val items = UpcomingPresenter.present(home, now, horizonDays = 2)
        val waiting = items.count { it.overdue || it.dueNow }
        val formatter = WhenFormatter(context, home.zone, now)

        Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                home.name,
                style = TextStyle(color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Medium),
                maxLines = 1,
                modifier = GlanceModifier.defaultWeight(),
            )
            Text(
                text = if (waiting > 0) {
                    context.resources.getQuantityString(R.plurals.hero_left, waiting, waiting)
                } else {
                    context.getString(R.string.hero_all_done)
                },
                style = TextStyle(color = if (waiting > 0) Due else Mint, fontSize = 13.sp, fontWeight = FontWeight.Bold),
            )
        }
        Spacer(GlanceModifier.height(8.dp))

        if (items.isEmpty()) {
            Text(context.getString(R.string.upcoming_empty_title), style = TextStyle(color = Muted, fontSize = 13.sp))
        } else {
            LazyColumn(GlanceModifier.fillMaxWidth()) {
                items(items.take(8), itemId = { it.needId.hashCode().toLong() }) { item ->
                    ItemRow(context, item, formatter)
                }
            }
        }
    }
}

@Composable
private fun ItemRow(context: Context, item: UpcomingItem, formatter: WhenFormatter) {
    val waiting = item.overdue || item.dueNow
    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp).clickable(actionStartActivity<MainActivity>()),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(GlanceModifier.size(10.dp).cornerRadius(5.dp).background(ColorProvider(Color(item.pet.tint)))) {}
        Spacer(GlanceModifier.width(10.dp))
        Column(GlanceModifier.defaultWeight()) {
            Text(item.title, style = TextStyle(color = Text0, fontSize = 15.sp, fontWeight = FontWeight.Medium), maxLines = 1)
            Text(
                text = when {
                    item.overdue -> context.getString(R.string.widget_overdue, item.pet.name)
                    item.dueNow -> context.getString(R.string.widget_due_now, item.pet.name)
                    else -> context.getString(R.string.widget_later, item.pet.name, formatter.moment(item.dueAt))
                },
                style = TextStyle(
                    color = when {
                        item.overdue -> Alert
                        item.dueNow -> Due
                        else -> Muted
                    },
                    fontSize = 12.sp,
                ),
                maxLines = 1,
            )
        }
        if (waiting) {
            Spacer(GlanceModifier.width(8.dp))
            Box(
                modifier = GlanceModifier
                    .size(40.dp)
                    .background(ImageProvider(R.drawable.widget_tick))
                    .clickable(actionRunCallback<TickAction>(actionParametersOf(TickAction.Need to item.needId))),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    provider = ImageProvider(R.drawable.ic_check),
                    contentDescription = context.getString(R.string.widget_tick, item.title),
                    colorFilter = ColorFilter.tint(if (item.overdue) Alert else Due),
                    modifier = GlanceModifier.size(18.dp),
                )
            }
        }
    }
}

/** Ticks a task straight from the widget. If the guard has anything to say, the app opens instead. */
class TickAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val container = (context.applicationContext as FedYetApp).container
        val repository = container.homeRepository
        repository.ready.first { it }
        val home = repository.home.value ?: return
        val need = parameters[Need]?.let(home::need) ?: return
        val now = container.clock()
        if (NeedsEngine(home.zone).checkLog(need, home.logs, now) == GuardVerdict.Allowed) {
            repository.addLog(need.id, now)
        } else {
            context.startActivity(
                android.content.Intent(context, MainActivity::class.java).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
        BoardWidget.refresh(context)
    }

    companion object {
        val Need = ActionParameters.Key<String>("needId")
    }
}
