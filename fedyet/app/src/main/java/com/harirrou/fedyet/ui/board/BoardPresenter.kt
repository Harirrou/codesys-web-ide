package com.harirrou.fedyet.ui.board

import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.engine.Guard
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.NeedsEngine
import com.harirrou.fedyet.engine.Schedule
import com.harirrou.fedyet.engine.Status
import java.time.Instant

/** What one row says under its title. Turned into words by the screen, which knows the language. */
sealed interface StatusLine {
    /** [next] is set when the task was done on an earlier day and the next date is worth showing. */
    data class Done(val at: Instant, val byId: String, val next: Instant?) : StatusLine
    data class DueAt(val due: Instant) : StatusLine
    data class DueNow(val due: Instant) : StatusLine
    data class Overdue(val due: Instant) : StatusLine
    data class Next(val due: Instant?, val everyDays: Int?) : StatusLine
}

data class NeedRowUi(
    val needId: String,
    val kind: NeedKind,
    val title: String,
    val status: Status,
    val line: StatusLine,
    val doneTwice: Boolean,
)

data class PetCardUi(val pet: Pet, val dueCount: Int, val doneCount: Int, val rows: List<NeedRowUi>)

data class BoardUi(val pets: List<PetCardUi>)

/** Turns a home and the current time into what the board shows. Pure, so it can be unit tested. */
object BoardPresenter {

    fun present(home: HomeSnapshot, now: Instant): BoardUi {
        val engine = NeedsEngine(home.zone)
        val today = now.atZone(home.zone).toLocalDate()

        val cards = home.pets.map { pet ->
            val rows = home.needs.filter { it.petId == pet.id && it.active }.map { need ->
                val state = engine.evaluate(need, home.logs, now)
                val due = state.slotDueAt
                val line: StatusLine = when (state.status) {
                    Status.DONE -> {
                        val done = state.doneLog!!
                        val doneToday = done.at.atZone(home.zone).toLocalDate() == today
                        val showNext = !doneToday || need.schedule !is Schedule.Daily
                        StatusLine.Done(done.at, done.by, if (showNext) state.nextDueAt else null)
                    }
                    Status.DUE -> if (due != null && now.isBefore(due)) StatusLine.DueAt(due) else StatusLine.DueNow(due ?: now)
                    Status.OVERDUE -> StatusLine.Overdue(due ?: now)
                    Status.NOT_DUE -> StatusLine.Next(state.nextDueAt, (need.schedule as? Schedule.EveryDays)?.days)
                }
                NeedRowUi(
                    needId = need.id,
                    kind = need.kind,
                    title = state.slotLabel ?: need.label,
                    status = state.status,
                    line = line,
                    doneTwice = need.guard != Guard.NONE && state.slotLogs.size >= 2,
                )
            }
            PetCardUi(
                pet = pet,
                dueCount = rows.count { it.status == Status.DUE || it.status == Status.OVERDUE },
                doneCount = rows.count { it.status == Status.DONE },
                rows = rows,
            )
        }
        return BoardUi(cards)
    }
}
