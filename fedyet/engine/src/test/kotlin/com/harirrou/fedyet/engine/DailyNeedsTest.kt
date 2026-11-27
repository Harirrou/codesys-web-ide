package com.harirrou.fedyet.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class DailyNeedsTest {
    private val engine = NeedsEngine(NEW_YORK)

    @Test
    fun `breakfast with no log is overdue in the afternoon`() {
        val need = meals()
        val state = engine.evaluate(need, emptyList(), at("2026-11-27 16:00"))
        assertEquals(Status.OVERDUE, state.status)
        assertEquals("Breakfast", state.slotLabel)
        assertEquals(at("2026-11-27 07:00"), state.slotDueAt)
    }

    @Test
    fun `breakfast logged shows done with who and when, and points at dinner`() {
        val need = meals()
        val breakfast = log(need, "Sara", "2026-11-27 07:10")
        val state = engine.evaluate(need, listOf(breakfast), at("2026-11-27 14:00"))
        assertEquals(Status.DONE, state.status)
        assertEquals("Breakfast", state.slotLabel)
        assertEquals("Sara", state.doneLog?.by)
        assertEquals(at("2026-11-27 18:30"), state.nextDueAt)
    }

    @Test
    fun `dinner becomes due when its window opens`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        assertEquals("Breakfast", engine.evaluate(need, logs, at("2026-11-27 16:59")).slotLabel)
        val state = engine.evaluate(need, logs, at("2026-11-27 17:00"))
        assertEquals(Status.DUE, state.status)
        assertEquals("Dinner", state.slotLabel)
    }

    @Test
    fun `dinner logged in its window is done`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"), log(need, "You", "2026-11-27 18:40"))
        val state = engine.evaluate(need, logs, at("2026-11-27 18:41"))
        assertEquals(Status.DONE, state.status)
        assertEquals("Dinner", state.slotLabel)
        assertEquals("You", state.doneLog?.by)
        assertEquals(at("2026-11-28 07:00"), state.nextDueAt)
    }

    @Test
    fun `dinner turns overdue after its late limit`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        assertEquals(Status.DUE, engine.evaluate(need, logs, at("2026-11-27 20:00")).status)
        assertEquals(Status.OVERDUE, engine.evaluate(need, logs, at("2026-11-27 20:01")).status)
    }

    @Test
    fun `a missed dinner stops nagging when breakfast opens next morning`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        val before = engine.evaluate(need, logs, at("2026-11-28 05:29"))
        assertEquals(Status.OVERDUE, before.status)
        assertEquals("Dinner", before.slotLabel)
        val after = engine.evaluate(need, logs, at("2026-11-28 05:30"))
        assertEquals(Status.DUE, after.status)
        assertEquals("Breakfast", after.slotLabel)
    }

    @Test
    fun `dinner given a little early counts as dinner and never nags`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"), log(need, "Omar", "2026-11-27 16:55"))
        val soon = engine.evaluate(need, logs, at("2026-11-27 16:56"))
        assertEquals(Status.DONE, soon.status)
        assertEquals("Dinner", soon.slotLabel)
        val later = engine.evaluate(need, logs, at("2026-11-27 19:30"))
        assertEquals(Status.DONE, later.status)
        assertEquals("Omar", later.doneLog?.by)
    }

    @Test
    fun `a late breakfast at lunchtime is still breakfast, and dinner stays due`() {
        val need = meals()
        val logs = listOf(log(need, "Omar", "2026-11-27 12:50"))
        val lunch = engine.evaluate(need, logs, at("2026-11-27 13:00"))
        assertEquals(Status.DONE, lunch.status)
        assertEquals("Breakfast", lunch.slotLabel)
        val evening = engine.evaluate(need, logs, at("2026-11-27 18:00"))
        assertEquals(Status.DUE, evening.status)
        assertEquals("Dinner", evening.slotLabel)
    }

    @Test
    fun `an undone log is ignored`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10", undone = true))
        val state = engine.evaluate(need, logs, at("2026-11-27 07:30"))
        assertEquals(Status.DUE, state.status)
        assertNull(state.doneLog)
    }

    @Test
    fun `logs of another need are ignored`() {
        val need = meals()
        val other = log(walk(), "Omar", "2026-11-27 07:10")
        assertEquals(Status.DUE, engine.evaluate(need, listOf(other), at("2026-11-27 07:30")).status)
    }

    @Test
    fun `a need created in the afternoon is not overdue for that morning`() {
        val need = meals(created = "2026-11-27 14:00")
        val state = engine.evaluate(need, emptyList(), at("2026-11-27 14:05"))
        assertEquals(Status.NOT_DUE, state.status)
        assertEquals(at("2026-11-27 18:30"), state.nextDueAt)
    }

    @Test
    fun `a paused need is never due`() {
        val need = meals().copy(active = false)
        val state = engine.evaluate(need, emptyList(), at("2026-11-27 19:00"))
        assertEquals(Status.NOT_DUE, state.status)
        assertNull(state.nextDueAt)
        assertNull(engine.nextNudgeAt(need, emptyList(), at("2026-11-27 19:00")))
    }

    @Test
    fun `a log from a phone with a fast clock counts as made now`() {
        val need = meals()
        // The phone's clock is a day ahead; the log must not mark tomorrow's meals done.
        val skewed = log(need, "Omar", "2026-11-28 18:40")
        val state = engine.evaluate(need, listOf(skewed), at("2026-11-27 18:40"))
        assertEquals(Status.DONE, state.status)
        assertEquals("Dinner", state.slotLabel)
        assertEquals(at("2026-11-27 18:30"), state.slotDueAt)
    }
}
