package com.harirrou.fedyet

import com.harirrou.fedyet.data.HomeEdits
import com.harirrou.fedyet.data.SampleHome
import com.harirrou.fedyet.engine.LogEntry
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

class BoardPresenterTest {
    private val zone: ZoneId = ZoneId.of("America/New_York")
    private fun at(text: String): Instant = LocalDateTime.parse(text).atZone(zone).toInstant()
    private val evening = at("2026-11-27T18:40")

    private fun board(now: Instant = evening) = BoardPresenter.present(SampleHome.build(now, zone), now)

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
    fun `a monthly dose given on the 1st points at the 1st of next month`() {
        val flea = board().pets[0].rows.first { it.title == "Flea and tick" }
        assertEquals(Status.DONE, flea.status)
        val next = assertIs<StatusLine.Done>(flea.line).next
        assertTrue(next != null)
        assertEquals("2026-12-01", next.atZone(zone).toLocalDate().toString())
    }

    @Test
    fun `in the afternoon yesterday's litter tick is gone and tonight's is not yet due`() {
        val litter = board(at("2026-11-27T14:26")).pets[1].rows.first { it.title == "Litter box" }
        assertEquals(Status.NOT_DUE, litter.status)
        assertIs<StatusLine.Next>(litter.line)
    }

    @Test
    fun `logging dinner turns it done by me and lowers the due count`() {
        val home = HomeEdits.addLog(SampleHome.build(evening, zone), LogEntry("x", "luna-meals", SampleHome.ME, evening))
        val luna = BoardPresenter.present(home, evening).pets[0]
        val dinner = luna.rows.first { it.title == "Dinner" }
        assertEquals(Status.DONE, dinner.status)
        assertEquals(SampleHome.ME, assertIs<StatusLine.Done>(dinner.line).byId)
        assertEquals(1, luna.dueCount)
    }

    @Test
    fun `undo puts the task back`() {
        val logged = HomeEdits.addLog(SampleHome.build(evening, zone), LogEntry("x", "luna-meals", SampleHome.ME, evening))
        val dinner = BoardPresenter.present(HomeEdits.undo(logged, "x"), evening).pets[0].rows.first { it.title == "Dinner" }
        assertEquals(Status.DUE, dinner.status)
    }
}
