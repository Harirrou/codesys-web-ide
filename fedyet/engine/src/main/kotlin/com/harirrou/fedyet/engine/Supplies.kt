package com.harirrou.fedyet.engine

import java.time.LocalDate
import kotlin.math.floor

/** "Runs out" arithmetic for food, litter and medicine. */
object Supplies {

    /** How many times a day a schedule uses up one portion, on average. */
    fun usesPerDay(schedule: Schedule): Double = when (schedule) {
        is Schedule.Daily -> schedule.slots.size.toDouble()
        is Schedule.EveryDays -> 1.0 / schedule.days
        is Schedule.Monthly -> 12.0 / 365.25
        is Schedule.Yearly -> 1.0 / 365.25
        is Schedule.Once -> 0.0
    }

    /**
     * Whole days of stock left, or null when it cannot be worked out
     * (nothing is used, or the portion size is unknown).
     */
    fun daysLeft(remaining: Double, perUse: Double, usesPerDay: Double): Int? {
        if (perUse <= 0.0 || usesPerDay <= 0.0) return null
        return floor(remaining.coerceAtLeast(0.0) / (perUse * usesPerDay)).toInt()
    }

    fun runsOutOn(today: LocalDate, remaining: Double, perUse: Double, usesPerDay: Double): LocalDate? =
        daysLeft(remaining, perUse, usesPerDay)?.let { today.plusDays(it.toLong()) }

    /** The last sensible day to reorder, [leadDays] before it runs out. */
    fun orderBy(runsOut: LocalDate, leadDays: Int): LocalDate = runsOut.minusDays(leadDays.toLong())
}
