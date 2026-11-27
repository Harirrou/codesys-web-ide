package com.harirrou.fedyet

import com.harirrou.fedyet.data.SampleHomeRepository
import com.harirrou.fedyet.engine.Status
import com.harirrou.fedyet.ui.board.BoardPresenter
import com.harirrou.fedyet.ui.board.StatusLine
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking

class BoardPresenterTest {
    private val evening: Instant = LocalDateTime.parse("2026-11-27T18:40").atZone(ZoneId.systemDefault()).toInstant()

    private fun board(now: Instant = evening) = BoardPresenter.present(SampleHomeRepository { now }.home.value!!, now)

    @Test
    fun `the sample home shows three pets with their tasks`() {
        val pets = board().pets
        assertEquals(listOf("Luna", "Miso", "Pebble"), pets.map { it.pet.name })
        assertEquals(listOf("Dinner", "Evening walk", "Joint tablet", "Flea and tick"), pets[0].rows.map { it.title })
    }

    @Test
    fun `at 18-40 recent tasks are open and earlier ones are done`() {
        val luna = board().pets[0]
        val byTitle = luna.rows.associateBy { it.title }
        assertEquals(Status.DUE, byTitle.getValue("Dinner").status)
        assertEquals(Status.OVERDUE, byTitle.getValue("Evening walk").status)
        assertEquals(Status.DONE, byTitle.getValue("Joint tablet").status)
        assertEquals(2, luna.dueCount)
    }

    @Test
    fun `the gecko fed yesterday is next due in two days, every three days`() {
        val crickets = board().pets[2].rows.first { it.title == "Crickets" }
        assertEquals(Status.NOT_DUE, crickets.status)
        val line = assertIs<StatusLine.Next>(crickets.line)
        assertEquals(3, line.everyDays)
    }

    @Test
    fun `a monthly dose done on the 1st shows when the next one is`() {
        val flea = board().pets[0].rows.first { it.title == "Flea and tick" }
        assertEquals(Status.DONE, flea.status)
        val line = assertIs<StatusLine.Done>(flea.line)
        assertTrue(line.next != null)
    }

    @Test
    fun `a monthly dose given on the 1st points at the 1st of next month`() {
        val flea = board().pets[0].rows.first { it.title == "Flea and tick" }
        val next = assertIs<StatusLine.Done>(flea.line).next!!
        assertEquals("2026-12-01", next.atZone(ZoneId.systemDefault()).toLocalDate().toString())
    }

    @Test
    fun `in the afternoon yesterday's litter tick is gone and tonight's is not yet due`() {
        val afternoon = LocalDateTime.parse("2026-11-27T14:26").atZone(ZoneId.systemDefault()).toInstant()
        val miso = board(afternoon).pets[1]
        val litter = miso.rows.first { it.title == "Litter box" }
        assertEquals(Status.NOT_DUE, litter.status)
        assertIs<StatusLine.Next>(litter.line)
    }

    @Test
    fun `logging dinner turns it done by me and lowers the due count`() = runBlocking {
        val repository = SampleHomeRepository { evening }
        repository.addLog("luna-meals", evening)
        val luna = BoardPresenter.present(repository.home.value!!, evening).pets[0]
        val dinner = luna.rows.first { it.title == "Dinner" }
        assertEquals(Status.DONE, dinner.status)
        assertEquals("me", assertIs<StatusLine.Done>(dinner.line).byId)
        assertEquals(1, luna.dueCount)
    }

    @Test
    fun `undo puts the task back`() = runBlocking {
        val repository = SampleHomeRepository { evening }
        val entry = repository.addLog("luna-meals", evening)
        repository.undo(entry.id)
        val dinner = BoardPresenter.present(repository.home.value!!, evening).pets[0].rows.first { it.title == "Dinner" }
        assertEquals(Status.DUE, dinner.status)
    }
}
