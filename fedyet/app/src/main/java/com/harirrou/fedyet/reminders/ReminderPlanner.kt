package com.harirrou.fedyet.reminders

import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.engine.NeedsEngine
import com.harirrou.fedyet.engine.Status
import java.time.Instant

/** One task that is waiting to be done right now. */
data class DueNotice(
    val needId: String,
    val petName: String,
    val title: String,
    val dueAt: Instant,
    val overdue: Boolean,
) {
    /** Identifies this occasion and stage, so each is announced once. */
    val key: String get() = "$needId|${dueAt.epochSecond}|${if (overdue) "o" else "d"}"
}

/**
 * Decides what to remind about and when to look again. Pure: no clocks, alarms or
 * notifications here, so the rules can be unit tested.
 *
 * A reminder is only ever about something that is due and that nobody has done. The alarm
 * is just a wake-up; whether anything is shown is decided from the home's data at that moment.
 */
object ReminderPlanner {

    /** Tasks whose time has come (or passed) and that nobody has ticked. */
    fun dueNow(home: HomeSnapshot, now: Instant): List<DueNotice> {
        val engine = NeedsEngine(home.zone)
        return home.needs.filter { it.active }.mapNotNull { need ->
            val pet = home.pet(need.petId) ?: return@mapNotNull null
            val state = engine.evaluate(need, home.logs, now)
            val due = state.slotDueAt ?: return@mapNotNull null
            val title = state.slotLabel ?: need.label
            when {
                state.status == Status.OVERDUE -> DueNotice(need.id, pet.name, title, due, overdue = true)
                state.status == Status.DUE && !now.isBefore(due) -> DueNotice(need.id, pet.name, title, due, overdue = false)
                else -> null
            }
        }
    }

    /** The next moment a task becomes due or overdue, or null when nothing is scheduled. */
    fun nextWakeAt(home: HomeSnapshot, now: Instant): Instant? {
        val engine = NeedsEngine(home.zone)
        return home.needs.filter { it.active }
            .mapNotNull { engine.nextNudgeAt(it, home.logs, now) }
            .filter { it.isAfter(now) }
            .minOrNull()
    }
}
