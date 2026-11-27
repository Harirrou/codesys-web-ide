package com.harirrou.fedyet.ui.board

import android.content.Context
import android.text.format.DateFormat
import com.harirrou.fedyet.R
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Says times the way people do: "6:30 PM", "yesterday", "Sunday", "Tue, Dec 1". Always in the home's time zone. */
class WhenFormatter(private val context: Context, private val zone: ZoneId, now: Instant) {

    private val locale: Locale = context.resources.configuration.locales[0]
    private val today = now.atZone(zone).toLocalDate()
    private val clock = DateTimeFormatter.ofPattern(if (DateFormat.is24HourFormat(context)) "H:mm" else "h:mm a", locale)
    private val date = DateTimeFormatter.ofPattern("EEE, MMM d", locale)
    private val weekdayAndClock = DateTimeFormatter.ofPattern(
        if (DateFormat.is24HourFormat(context)) "EEEE · H:mm" else "EEEE · h:mm a",
        locale,
    )

    fun time(instant: Instant): String = clock.format(instant.atZone(zone))

    /** The header line, e.g. "Friday · 6:40 PM". */
    fun header(instant: Instant): String = weekdayAndClock.format(instant.atZone(zone))

    /** A moment, shortest form: the time if it is today, otherwise the day. */
    fun moment(instant: Instant): String {
        val day = instant.atZone(zone).toLocalDate()
        return if (day == today) time(instant) else dayName(instant)
    }

    /** A day relative to today: "today at 6:30 PM", "tomorrow", "Sunday", "Tue, Dec 1". */
    fun day(instant: Instant): String {
        val day = instant.atZone(zone).toLocalDate()
        return if (day == today) context.getString(R.string.when_today_at, time(instant)) else dayName(instant)
    }

    private fun dayName(instant: Instant): String {
        val local = instant.atZone(zone)
        return when (ChronoUnit.DAYS.between(today, local.toLocalDate())) {
            1L -> context.getString(R.string.when_tomorrow)
            -1L -> context.getString(R.string.when_yesterday)
            in 2L..6L -> local.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
            else -> date.format(local)
        }
    }
}
