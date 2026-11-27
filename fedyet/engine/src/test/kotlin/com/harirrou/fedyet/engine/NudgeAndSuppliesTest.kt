package com.harirrou.fedyet.engine

import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class NudgeAndSuppliesTest {
    private val engine = NeedsEngine(NEW_YORK)

    @Test
    fun `before the window the reminder is set for the due time`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        assertEquals(at("2026-11-27 18:30"), engine.nextNudgeAt(need, logs, at("2026-11-27 14:00")))
        assertEquals(at("2026-11-27 18:30"), engine.nextNudgeAt(need, logs, at("2026-11-27 17:30")))
    }

    @Test
    fun `after the due time the next reminder is the overdue one`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        assertEquals(at("2026-11-27 20:00"), engine.nextNudgeAt(need, logs, at("2026-11-27 18:45")))
    }

    @Test
    fun `a missed dinner does not stop tomorrow's breakfast from being announced`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        assertEquals(at("2026-11-28 07:00"), engine.nextNudgeAt(need, logs, at("2026-11-27 21:00")))
    }

    @Test
    fun `an overdue interval task has nothing more to announce until it is done`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        assertNull(engine.nextNudgeAt(need, logs, at("2026-11-29 12:00")))
    }

    @Test
    fun `when someone else logs dinner the reminder moves to tomorrow's breakfast`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"), log(need, "Omar", "2026-11-27 18:20"))
        assertEquals(at("2026-11-28 07:00"), engine.nextNudgeAt(need, logs, at("2026-11-27 18:21")))
    }

    @Test
    fun `an interval need reminds on its next due day`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        assertEquals(at("2026-11-27 09:00"), engine.nextNudgeAt(need, logs, at("2026-11-25 12:00")))
    }

    @Test
    fun `kibble at two cups twice a day lasts six days and should be ordered two days before`() {
        val perDay = Supplies.usesPerDay(meals().schedule)
        assertEquals(2.0, perDay)
        assertEquals(6, Supplies.daysLeft(remaining = 24.0, perUse = 2.0, usesPerDay = perDay))
        val runsOut = Supplies.runsOutOn(LocalDate.of(2026, 11, 27), 24.0, 2.0, perDay)
        assertEquals(LocalDate.of(2026, 12, 3), runsOut)
        assertEquals(LocalDate.of(2026, 12, 1), Supplies.orderBy(runsOut!!, leadDays = 2))
    }

    @Test
    fun `a tablet a day and crickets every three days use stock at the right rate`() {
        assertEquals(24, Supplies.daysLeft(24.0, 1.0, Supplies.usesPerDay(tablet().schedule)))
        assertEquals(30, Supplies.daysLeft(100.0, 10.0, Supplies.usesPerDay(crickets().schedule)))
    }

    @Test
    fun `stock that cannot be worked out gives no answer, and empty stock gives zero`() {
        assertNull(Supplies.daysLeft(10.0, 0.0, 2.0))
        assertNull(Supplies.daysLeft(10.0, 1.0, 0.0))
        assertEquals(0, Supplies.daysLeft(0.0, 1.0, 2.0))
        assertEquals(0, Supplies.daysLeft(-3.0, 1.0, 2.0))
    }
}
