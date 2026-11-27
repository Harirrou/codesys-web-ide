package com.harirrou.fedyet.engine

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/** What sort of care a need is. Only used to pick sensible defaults. */
enum class NeedKind { MEAL, WALK, MEDICINE, CLEAN, WATER, OTHER }

/**
 * How hard the app pushes back when someone tries to log a need that looks already done.
 * NONE: never (walks). SOFT: a warning that one tap dismisses (meals).
 * HARD: a deliberate confirmation (medicine).
 */
enum class Guard { NONE, SOFT, HARD }

/** One time of day in a daily schedule, e.g. 07:00 "Breakfast". */
data class DailySlot(val time: LocalTime, val label: String? = null)

/** When a need comes round. All times are local to the home's time zone. */
sealed interface Schedule {

    /** Every day at each of [slots], e.g. breakfast and dinner. */
    data class Daily(val slots: List<DailySlot>) : Schedule {
        init {
            require(slots.isNotEmpty()) { "A daily schedule needs at least one time" }
            require(slots.map { it.time }.distinct().size == slots.size) { "Daily times must differ" }
        }
    }

    /**
     * Every [days] days, counted from the last time it was actually done.
     * [firstDue] is the first due date when it has never been done; when null the
     * engine uses the day the need was created (or the day after, if [at] had passed).
     */
    data class EveryDays(val days: Int, val at: LocalTime, val firstDue: LocalDate? = null) : Schedule {
        init {
            require(days >= 1) { "Interval must be at least one day" }
        }
    }

    /** On a day of each month. Day 29-31 falls on the last day of shorter months. */
    data class Monthly(val dayOfMonth: Int, val at: LocalTime) : Schedule {
        init {
            require(dayOfMonth in 1..31) { "Day of month must be 1-31" }
        }
    }

    /** Once a year. 29 February falls on 28 February in non-leap years. */
    data class Yearly(val month: Int, val dayOfMonth: Int, val at: LocalTime) : Schedule {
        init {
            require(month in 1..12) { "Month must be 1-12" }
            require(dayOfMonth in 1..31) { "Day of month must be 1-31" }
        }
    }

    /** A single occasion. */
    data class Once(val at: LocalDateTime) : Schedule
}

/**
 * Something a pet needs, with its schedule.
 *
 * @param earlyMinutes how long before the due time the need shows as due.
 * @param lateMinutes how long after the due time it turns overdue.
 * @param minGapMinutes shortest safe gap between two logs; null means "work it out from the schedule".
 */
data class Need(
    val id: String,
    val petId: String,
    val kind: NeedKind,
    val label: String,
    val schedule: Schedule,
    val createdAt: Instant,
    val guard: Guard = Defaults.guard(kind),
    val earlyMinutes: Int = Defaults.earlyMinutes(schedule),
    val lateMinutes: Int = Defaults.lateMinutes(schedule),
    val minGapMinutes: Int? = null,
    val active: Boolean = true,
) {
    init {
        require(earlyMinutes >= 0 && lateMinutes >= 0) { "Windows cannot be negative" }
    }
}

/** One tap on the board. Undo sets [undone]; a log is never deleted. */
data class LogEntry(
    val id: String,
    val needId: String,
    val by: String,
    val at: Instant,
    val undone: Boolean = false,
)

enum class Status { NOT_DUE, DUE, OVERDUE, DONE }

/**
 * What the board shows for one need right now.
 *
 * @param slotDueAt due time of the occasion being shown; null when nothing is scheduled yet.
 * @param slotLabel label of that occasion for daily schedules ("Dinner").
 * @param doneLog the log that satisfied it, when [status] is DONE.
 * @param slotLogs every live log counted for this occasion (two or more means it was done twice).
 * @param nextDueAt the next due time the household should care about.
 * @param followingDueAt the due time of the occasion after the one shown, when the schedule has
 *   fixed occasions. A missed dinner must not stop tomorrow's breakfast from being announced.
 */
data class NeedState(
    val status: Status,
    val slotDueAt: Instant?,
    val slotLabel: String?,
    val doneLog: LogEntry?,
    val slotLogs: List<LogEntry>,
    val nextDueAt: Instant?,
    val followingDueAt: Instant? = null,
    /** The name of the occasion at [nextDueAt] ("Breakfast"), when the schedule names its times. */
    val nextLabel: String? = null,
)

enum class GuardReason {
    /** This occasion already has a log. */
    ALREADY_DONE,

    /** The last log is closer than the safe gap, even though it belongs to another occasion. */
    TOO_SOON,
}

/** The answer to "may this person log it now?" */
sealed interface GuardVerdict {
    data object Allowed : GuardVerdict
    data class Warn(val reason: GuardReason, val previous: LogEntry) : GuardVerdict
    data class ConfirmRequired(val reason: GuardReason, val previous: LogEntry) : GuardVerdict
}

object Defaults {
    private const val DAY = 24 * 60

    fun guard(kind: NeedKind): Guard = when (kind) {
        NeedKind.MEDICINE -> Guard.HARD
        NeedKind.MEAL -> Guard.SOFT
        else -> Guard.NONE
    }

    fun earlyMinutes(schedule: Schedule): Int = when (schedule) {
        is Schedule.Daily -> 90
        // Due from the start of its day.
        is Schedule.EveryDays -> schedule.at.toSecondOfDay() / 60
        is Schedule.Monthly -> 3 * DAY
        is Schedule.Yearly -> 14 * DAY
        is Schedule.Once -> 60
    }

    fun lateMinutes(schedule: Schedule): Int = when (schedule) {
        is Schedule.Daily -> 90
        // Overdue from the next day.
        is Schedule.EveryDays -> DAY - schedule.at.toSecondOfDay() / 60
        is Schedule.Monthly -> DAY - schedule.at.toSecondOfDay() / 60
        is Schedule.Yearly -> DAY - schedule.at.toSecondOfDay() / 60
        is Schedule.Once -> 60
    }

    /**
     * Shortest gap between two logs before the guard speaks up.
     * Medicine (HARD) uses three quarters of the normal spacing, so tomorrow's
     * once-a-day tablet cannot quietly be given tonight. Everything else uses half.
     */
    fun minGapMinutes(schedule: Schedule, guard: Guard): Int {
        val spacing = when (schedule) {
            is Schedule.Daily -> {
                val minutes = schedule.slots.map { it.time.toSecondOfDay() / 60 }.sorted()
                if (minutes.size == 1) {
                    DAY
                } else {
                    val gaps = minutes.zipWithNext { a, b -> b - a } + (DAY - minutes.last() + minutes.first())
                    gaps.min()
                }
            }
            is Schedule.EveryDays -> schedule.days * DAY
            is Schedule.Monthly -> 28 * DAY
            is Schedule.Yearly -> 365 * DAY
            is Schedule.Once -> 0
        }
        return if (guard == Guard.HARD) spacing * 3 / 4 else spacing / 2
    }
}
