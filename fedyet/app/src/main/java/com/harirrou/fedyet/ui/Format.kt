package com.harirrou.fedyet.ui

import android.content.Context
import android.text.format.DateFormat
import com.harirrou.fedyet.R
import com.harirrou.fedyet.engine.Schedule
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Says times the way people do: "6:30 PM", "yesterday", "Sunday", "Tue, Dec 1". Always in the home's time zone. */
class WhenFormatter(private val context: Context, private val zone: ZoneId, now: Instant) {

    private val locale: Locale = context.resources.configuration.locales[0]
    private val today = now.atZone(zone).toLocalDate()
    private val is24 = DateFormat.is24HourFormat(context)
    private val clock = DateTimeFormatter.ofPattern(if (is24) "H:mm" else "h:mm a", locale)
    private val date = DateTimeFormatter.ofPattern("EEE, MMM d", locale)
    private val monthDay = DateTimeFormatter.ofPattern("MMM d", locale)
    private val weekdayAndClock = DateTimeFormatter.ofPattern(if (is24) "EEEE · H:mm" else "EEEE · h:mm a", locale)

    fun time(instant: Instant): String = clock.format(instant.atZone(zone))

    fun time(time: LocalTime): String = clock.format(time)

    fun date(day: LocalDate): String = date.format(day)

    /** The header line, e.g. "Friday · 6:40 PM". */
    fun header(instant: Instant): String = weekdayAndClock.format(instant.atZone(zone))

    /** A moment, shortest form: the time if it is today, otherwise the day. */
    fun moment(instant: Instant): String {
        val day = instant.atZone(zone).toLocalDate()
        return if (day == today) time(instant) else dayName(day)
    }

    /** A day relative to today, with the time when it is today: "today at 6:30 PM", "tomorrow", "Sunday". */
    fun day(instant: Instant): String {
        val day = instant.atZone(zone).toLocalDate()
        return if (day == today) context.getString(R.string.when_today_at, time(instant)) else dayName(day)
    }

    /** A heading for a list grouped by day: "Today", "Tomorrow", "Sunday", "Tue, Dec 1". */
    fun dayHeading(instant: Instant): String {
        val day = instant.atZone(zone).toLocalDate()
        return if (day == today) context.getString(R.string.when_today) else dayName(day).replaceFirstChar { it.titlecase(locale) }
    }

    private fun dayName(day: LocalDate): String = when (ChronoUnit.DAYS.between(today, day)) {
        1L -> context.getString(R.string.when_tomorrow)
        -1L -> context.getString(R.string.when_yesterday)
        in 2L..6L -> day.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
        else -> date.format(day)
    }

    /** One line saying when a task repeats, e.g. "Every day · 7:00, 18:30". */
    fun schedule(schedule: Schedule): String = when (schedule) {
        is Schedule.Daily -> context.getString(
            R.string.repeat_summary_daily,
            schedule.slots.sortedBy { it.time }.joinToString(", ") { time(it.time) },
        )
        is Schedule.EveryDays -> context.resources.getQuantityString(
            R.plurals.repeat_summary_every,
            schedule.days,
            schedule.days,
            time(schedule.at),
        )
        is Schedule.Monthly -> context.getString(R.string.repeat_summary_monthly, schedule.dayOfMonth, time(schedule.at))
        is Schedule.Yearly -> context.getString(
            R.string.repeat_summary_yearly,
            monthDay.format(
                LocalDate.of(2024, schedule.month, minOf(schedule.dayOfMonth, java.time.Month.of(schedule.month).maxLength())),
            ),
            time(schedule.at),
        )
        is Schedule.Once -> context.getString(
            R.string.repeat_summary_once,
            date.format(schedule.at.toLocalDate()),
            time(schedule.at.toLocalTime()),
        )
    }
}

/** Shows an amount without a pointless ".0". */
fun amount(value: Double): String =
    if (value == Math.floor(value) && value < 1e9) value.toLong().toString() else String.format(Locale.US, "%.1f", value)
