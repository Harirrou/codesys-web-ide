package com.harirrou.fedyet.engine

import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Decides, for one home, what is due, done or overdue.
 *
 * Everything is worked out in the home's time zone ([zone]), never the phone's, so a
 * family member who is travelling still sees the home's day.
 *
 * The engine is pure: give it a need, that need's logs and the current instant.
 * For interval, monthly and yearly needs the logs must include the most recent
 * live log, however old (the data layer keeps it on the need as `lastDoneAt`).
 *
 * Which occasion a log counts for depends only on its time and the need's schedule,
 * never on other logs. Two phones that are both offline therefore always agree, and
 * a double log shows up as two logs on the same occasion.
 *
 * Log times should be server times. A log stamped later than "now" (a phone with a
 * fast clock) is treated as made now.
 */
class NeedsEngine(private val zone: ZoneId) {

    private data class Slot(val dueAt: Instant, val label: String?)

    /** The key of the day document a log made at [instant] belongs to, e.g. "2026-11-27". */
    fun dayKey(instant: Instant): String = localDate(instant).toString()

    fun evaluate(need: Need, logs: List<LogEntry>, now: Instant): NeedState {
        if (!need.active) return NeedState(Status.NOT_DUE, null, null, null, emptyList(), null)
        val live = liveLogs(need, logs, now)
        return when (val schedule = need.schedule) {
            is Schedule.EveryDays -> evaluateInterval(need, schedule, live, now)
            else -> evaluateSlots(need, live, now)
        }
    }

    /** Whether a log made right now should go straight through, warn, or need confirming. */
    fun checkLog(need: Need, logs: List<LogEntry>, now: Instant): GuardVerdict {
        if (need.guard == Guard.NONE || !need.active) return GuardVerdict.Allowed
        val live = liveLogs(need, logs, now)

        val already: LogEntry? = when (need.schedule) {
            is Schedule.EveryDays -> live.lastOrNull()?.takeIf { !localDate(it.at).isBefore(localDate(now)) }
            else -> {
                val slots = slotsAround(need, now)
                if (slots.isEmpty()) {
                    null
                } else {
                    val target = ownerIndex(slots, need.earlyMinutes, now)
                    if (target < 0) null else ownedLogs(slots, need.earlyMinutes, target, live).firstOrNull()
                }
            }
        }

        val (reason, previous) = if (already != null) {
            GuardReason.ALREADY_DONE to already
        } else {
            val last = live.lastOrNull() ?: return GuardVerdict.Allowed
            val gap = need.minGapMinutes ?: Defaults.minGapMinutes(need.schedule, need.guard)
            if (gap <= 0 || Duration.between(last.at, now).toMinutes() >= gap) return GuardVerdict.Allowed
            GuardReason.TOO_SOON to last
        }
        return if (need.guard == Guard.HARD) {
            GuardVerdict.ConfirmRequired(reason, previous)
        } else {
            GuardVerdict.Warn(reason, previous)
        }
    }

    /**
     * True when a guarded need was logged more than once for the same occasion,
     * for example two people tapping while both phones were offline.
     */
    fun isDoneTwice(need: Need, logs: List<LogEntry>, now: Instant): Boolean =
        need.guard != Guard.NONE && evaluate(need, logs, now).slotLogs.size >= 2

    /**
     * The next moment a reminder should fire if nobody does anything, or null if
     * there is nothing left to say. Recompute whenever a log arrives.
     */
    fun nextNudgeAt(need: Need, logs: List<LogEntry>, now: Instant): Instant? {
        val state = evaluate(need, logs, now)
        return when (state.status) {
            Status.NOT_DUE, Status.DONE -> state.nextDueAt
            Status.DUE -> {
                val due = state.slotDueAt ?: return null
                if (now.isBefore(due)) due else due.plus(minutes(need.lateMinutes))
            }
            // Nothing more to say about this occasion, but the next one still gets its turn.
            Status.OVERDUE -> state.followingDueAt
        }
    }

    // ---- Daily, monthly, yearly, once: fixed occasions ("slots") ----

    private fun evaluateSlots(need: Need, live: List<LogEntry>, now: Instant): NeedState {
        val slots = slotsAround(need, now)
        if (slots.isEmpty()) return NeedState(Status.NOT_DUE, null, null, null, emptyList(), null)

        val opens = opens(slots, need.earlyMinutes)
        val openIndex = opens.indexOfLast { !it.isAfter(now) }
        // A slot done early (before it opened) is shown as soon as it has a log.
        val loggedIndex = slots.indices.lastOrNull { ownedLogs(slots, need.earlyMinutes, it, live).isNotEmpty() } ?: -1
        val index = maxOf(openIndex, loggedIndex)

        if (index < 0) {
            val first = slots.first()
            return NeedState(Status.NOT_DUE, null, first.label, null, emptyList(), first.dueAt, nextLabel = first.label)
        }

        val slot = slots[index]
        val owned = ownedLogs(slots, need.earlyMinutes, index, live)
        if (owned.isNotEmpty()) {
            val next = slots.drop(index + 1).firstOrNull()
            // A daily task ticked on an earlier day is not "done" today: until today's
            // occasion opens, the board shows when it is next due instead of an old tick.
            val today = localDate(now)
            val fromAnEarlierDay = need.schedule is Schedule.Daily &&
                next != null &&
                localDate(slot.dueAt).isBefore(today) &&
                owned.all { localDate(it.at).isBefore(today) }
            if (fromAnEarlierDay) {
                return NeedState(Status.NOT_DUE, null, next!!.label, null, emptyList(), next.dueAt, nextLabel = next.label)
            }
            return NeedState(Status.DONE, slot.dueAt, slot.label, owned.first(), owned, next?.dueAt, nextLabel = next?.label)
        }
        val overdueFrom = slot.dueAt.plus(minutes(need.lateMinutes))
        val status = if (now.isAfter(overdueFrom)) Status.OVERDUE else Status.DUE
        val following = slots.getOrNull(index + 1)?.dueAt
        return NeedState(status, slot.dueAt, slot.label, null, emptyList(), slot.dueAt, following, nextLabel = slot.label)
    }

    /**
     * Occasions near [now], oldest first, leaving out any that had already passed
     * when the need was created (a need added at 2 PM is not "overdue" for breakfast).
     */
    private fun slotsAround(need: Need, now: Instant): List<Slot> {
        val today = localDate(now)
        val raw: List<Slot> = when (val schedule = need.schedule) {
            is Schedule.Daily -> {
                val ordered = schedule.slots.sortedBy { it.time }
                (-2L..2L).flatMap { offset ->
                    val date = today.plusDays(offset)
                    ordered.map { Slot(instantAt(date, it.time), it.label) }
                }
            }
            is Schedule.Monthly -> (-2L..2L).map { offset ->
                val month = YearMonth.from(today).plusMonths(offset)
                Slot(instantAt(month.atDay(minOf(schedule.dayOfMonth, month.lengthOfMonth())), schedule.at), null)
            }
            is Schedule.Yearly -> (-2..2).map { offset ->
                val month = YearMonth.of(today.year + offset, schedule.month)
                Slot(instantAt(month.atDay(minOf(schedule.dayOfMonth, month.lengthOfMonth())), schedule.at), null)
            }
            is Schedule.Once -> listOf(Slot(schedule.at.atZone(zone).toInstant(), null))
            is Schedule.EveryDays -> emptyList()
        }
        val late = minutes(need.lateMinutes)
        return raw.sortedBy { it.dueAt }.filter { !it.dueAt.plus(late).isBefore(need.createdAt) }
    }

    private fun midpoint(a: Slot, b: Slot): Instant = a.dueAt.plus(Duration.between(a.dueAt, b.dueAt).dividedBy(2))

    /** [before] minutes ahead of slot [i]'s due time, but never earlier than halfway from the slot before. */
    private fun ahead(slots: List<Slot>, i: Int, before: Int): Instant {
        val natural = slots[i].dueAt.minus(minutes(before))
        if (i == 0) return natural
        val mid = midpoint(slots[i - 1], slots[i])
        return if (natural.isBefore(mid)) mid else natural
    }

    /** When each slot starts showing as due on the board. */
    private fun opens(slots: List<Slot>, early: Int): List<Instant> = slots.indices.map { ahead(slots, it, early) }

    /**
     * The slot a log made at [instant] counts for. A slot starts claiming logs twice as
     * early as it opens, so dinner given half an hour before its window is dinner, while a
     * missed breakfast given at lunchtime is still breakfast.
     *
     * Returns -1 for a log from before the first occasion started claiming, such as a
     * "last done" date entered when the need was created. Such a log counts for the
     * safety gap but never ticks an occasion.
     */
    private fun ownerIndex(slots: List<Slot>, early: Int, instant: Instant): Int {
        if (instant.isBefore(ahead(slots, 0, early * 2))) return -1
        var index = 0
        for (i in 1 until slots.size) {
            if (!instant.isBefore(ahead(slots, i, early * 2))) index = i
        }
        return index
    }

    private fun ownedLogs(slots: List<Slot>, early: Int, index: Int, live: List<LogEntry>): List<LogEntry> =
        live.filter { ownerIndex(slots, early, it.at) == index }

    // ---- Every N days: counted from the last time it was actually done ----

    private fun evaluateInterval(
        need: Need,
        schedule: Schedule.EveryDays,
        live: List<LogEntry>,
        now: Instant,
    ): NeedState {
        val today = localDate(now)
        val last = live.lastOrNull()
        val dueDate = if (last != null) {
            localDate(last.at).plusDays(schedule.days.toLong())
        } else {
            schedule.firstDue ?: firstDueDate(need, schedule)
        }
        val dueAt = instantAt(dueDate, schedule.at)

        if (last != null && !localDate(last.at).isBefore(today)) {
            val todays = live.filter { !localDate(it.at).isBefore(today) }
            return NeedState(Status.DONE, dueAt, null, todays.first(), todays, dueAt)
        }
        val open = dueAt.minus(minutes(need.earlyMinutes))
        val overdueFrom = dueAt.plus(minutes(need.lateMinutes))
        val status = when {
            now.isBefore(open) -> Status.NOT_DUE
            now.isAfter(overdueFrom) -> Status.OVERDUE
            else -> Status.DUE
        }
        return NeedState(status, dueAt, null, null, emptyList(), dueAt)
    }

    private fun firstDueDate(need: Need, schedule: Schedule.EveryDays): LocalDate {
        val created = localDate(need.createdAt)
        val sameDay = instantAt(created, schedule.at).plus(minutes(need.lateMinutes))
        return if (sameDay.isBefore(need.createdAt)) created.plusDays(1) else created
    }

    // ---- Helpers ----

    private fun liveLogs(need: Need, logs: List<LogEntry>, now: Instant): List<LogEntry> =
        logs.filter { it.needId == need.id && !it.undone }
            .map { if (it.at.isAfter(now)) it.copy(at = now) else it }
            .sortedBy { it.at }

    private fun localDate(instant: Instant): LocalDate = instant.atZone(zone).toLocalDate()

    /**
     * A local time on a date, as an instant. On the day clocks go forward, a time that
     * does not exist (02:30) moves forward by the gap (03:30); on the day they go back,
     * a time that happens twice uses the first one. This is java.time's standard rule.
     */
    private fun instantAt(date: LocalDate, time: LocalTime): Instant = ZonedDateTime.of(date, time, zone).toInstant()

    private fun minutes(value: Int): Duration = Duration.ofMinutes(value.toLong())
}
