package com.harirrou.fedyet.ui.upcoming

import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.NeedsEngine
import com.harirrou.fedyet.engine.Status
import java.time.Duration
import java.time.Instant

data class UpcomingItem(
    val needId: String,
    val pet: Pet,
    val title: String,
    val kind: NeedKind,
    val dueAt: Instant,
    val overdue: Boolean,
    val dueNow: Boolean,
)

/** What is coming up across the whole home: overdue first, then by time, up to [horizonDays] ahead. */
object UpcomingPresenter {
    fun present(home: HomeSnapshot, now: Instant, horizonDays: Long = 30): List<UpcomingItem> {
        val engine = NeedsEngine(home.zone)
        val horizon = now.plus(Duration.ofDays(horizonDays))
        return home.needs.filter { it.active }.mapNotNull { need ->
            val pet = home.pet(need.petId) ?: return@mapNotNull null
            val state = engine.evaluate(need, home.logs, now)
            val overdue = state.status == Status.OVERDUE
            val dueNow = state.status == Status.DUE
            val dueAt = (if (overdue || dueNow) state.slotDueAt else state.nextDueAt) ?: return@mapNotNull null
            if (dueAt.isAfter(horizon)) return@mapNotNull null
            UpcomingItem(need.id, pet, state.slotLabel ?: need.label, need.kind, dueAt, overdue, dueNow)
        }.sortedWith(compareByDescending<UpcomingItem> { it.overdue }.thenBy { it.dueAt })
    }
}
