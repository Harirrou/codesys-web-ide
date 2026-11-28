package com.harirrou.fedyet.reminders

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.harirrou.fedyet.MainActivity
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.ui.WhenFormatter
import java.time.Instant

/**
 * Turns the plan into real notifications and one alarm.
 *
 * [sync] is the only entry point. Call it whenever the home changes, when the alarm fires,
 * after a restart and when the clock changes. It is safe to call as often as you like:
 * it shows what is newly due, clears what has been done, and sets the alarm for the next
 * moment something becomes due.
 */
class ReminderScheduler(
    private val context: Context,
    private val clock: () -> Instant,
    private val settings: ReminderSettings,
) {
    private val notifications = NotificationManagerCompat.from(context)
    private val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun sync(home: HomeSnapshot?) {
        val now = clock()
        // A sample home never reminds: its pets are not real.
        if (home == null || home.isSample || !settings.enabled.value) {
            settings.shownNeeds.forEach { notifications.cancel(it.hashCode()) }
            settings.shownNeeds = emptySet()
            setAlarm(null)
            return
        }

        val notices = ReminderPlanner.dueNow(home, now)
        val waiting = notices.map { it.needId }.toSet()

        // Clear reminders for anything done, paused or deleted since they were shown.
        val shown = settings.shownNeeds
        (shown - waiting).forEach { notifications.cancel(it.hashCode()) }

        val posted = mutableSetOf<String>()
        if (notifications.areNotificationsEnabled()) {
            ensureChannel()
            val formatter = WhenFormatter(context, home.zone, now)
            notices.filter { settings.firstTime(it.key) }.forEach {
                post(it, formatter)
                posted += it.needId
            }
        }
        settings.shownNeeds = (shown intersect waiting) + posted

        setAlarm(ReminderPlanner.nextWakeAt(home, now))
    }

    @SuppressLint("MissingPermission") // sync() checks areNotificationsEnabled() first
    private fun post(notice: DueNotice, formatter: WhenFormatter) {
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val done = PendingIntent.getBroadcast(
            context,
            notice.needId.hashCode(),
            Intent(context, ReminderReceiver::class.java)
                .setAction(ReminderReceiver.ACTION_DONE)
                .putExtra(ReminderReceiver.EXTRA_NEED, notice.needId),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val text = context.getString(
            if (notice.overdue) R.string.notif_overdue else R.string.notif_due,
            formatter.moment(notice.dueAt),
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_fedyet)
            .setContentTitle(context.getString(R.string.notif_title, notice.petName, notice.title))
            .setContentText(text)
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setColor(0xFF1E5A46.toInt())
            .setWhen(notice.dueAt.toEpochMilli())
            .addAction(0, context.getString(R.string.notif_done), done)
            .build()
        notifications.notify(notice.needId.hashCode(), notification)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL,
                context.getString(R.string.notif_channel),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply { description = context.getString(R.string.notif_channel_description) }
            notifications.createNotificationChannel(channel)
        }
    }

    /**
     * One alarm, replaced each time. Exact when the phone allows it (always before Android 12;
     * from Android 14 the user must allow "Alarms & reminders"), otherwise as close as the
     * system will give, which can be several minutes late while the phone is asleep.
     */
    private fun setAlarm(at: Instant?) {
        val wake = PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, ReminderReceiver::class.java).setAction(ReminderReceiver.ACTION_WAKE),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        if (at == null) {
            alarms.cancel(wake)
            return
        }
        val millis = at.toEpochMilli()
        val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()
        try {
            if (exactAllowed) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, wake)
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, wake)
            }
        } catch (_: SecurityException) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, wake)
        }
    }

    private companion object {
        const val CHANNEL = "due"
    }
}
