package com.harirrou.fedyet.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.harirrou.fedyet.FedYetApp
import com.harirrou.fedyet.engine.GuardVerdict
import com.harirrou.fedyet.engine.NeedsEngine
import com.harirrou.fedyet.widget.BoardWidget
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Wakes when the alarm fires or when "Done" is tapped on a reminder. Not exported:
 * only this app can send it, so no other app can tick a task.
 */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val container = (context.applicationContext as FedYetApp).container
        val pending = goAsync()
        container.scope.launch {
            try {
                val repository = container.homeRepository
                repository.ready.first { it }
                if (intent.action == ACTION_DONE) {
                    val needId = intent.getStringExtra(EXTRA_NEED)
                    val home = repository.home.value
                    val need = needId?.let { home?.need(it) }
                    if (home != null && need != null) {
                        val now = container.clock()
                        // Only a clean tick goes through from a notification. If the guard has
                        // anything to say, the reminder stays and the person opens the app.
                        if (NeedsEngine(home.zone).checkLog(need, home.logs, now) == GuardVerdict.Allowed) {
                            repository.addLog(need.id, now)
                        }
                    }
                }
                container.reminders.sync(repository.home.value)
                BoardWidget.refresh(context)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val ACTION_WAKE = "com.harirrou.fedyet.reminders.WAKE"
        const val ACTION_DONE = "com.harirrou.fedyet.reminders.DONE"
        const val EXTRA_NEED = "needId"
    }
}

/**
 * Sets the alarm again after a restart, an app update, or a change to the clock or time zone,
 * all of which wipe or shift alarms. Exported so the system can reach it; it reads nothing
 * from the incoming message.
 */
class SystemEventsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val container = (context.applicationContext as FedYetApp).container
        val pending = goAsync()
        container.scope.launch {
            try {
                container.homeRepository.ready.first { it }
                container.reminders.sync(container.homeRepository.home.value)
                BoardWidget.refresh(context)
            } finally {
                pending.finish()
            }
        }
    }
}
