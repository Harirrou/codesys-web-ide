package com.harirrou.fedyet.engine

import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class IntervalNeedsTest {
    private val engine = NeedsEngine(NEW_YORK)

    @Test
    fun `never done is due on the day it was created`() {
        val need = crickets(created = "2026-11-20 10:00")
        val state = engine.evaluate(need, emptyList(), at("2026-11-20 10:05"))
        assertEquals(Status.DUE, state.status)
        assertEquals(at("2026-11-20 09:00"), state.slotDueAt)
    }

    @Test
    fun `done today shows done and points three days ahead`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        val state = engine.evaluate(need, logs, at("2026-11-24 21:00"))
        assertEquals(Status.DONE, state.status)
        assertEquals("Sara", state.doneLog?.by)
        assertEquals(at("2026-11-27 09:00"), state.nextDueAt)
    }

    @Test
    fun `between feeds it is not due`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        val state = engine.evaluate(need, logs, at("2026-11-25 12:00"))
        assertEquals(Status.NOT_DUE, state.status)
        assertEquals(at("2026-11-27 09:00"), state.nextDueAt)
    }

    @Test
    fun `it is due all through its day and overdue from the next`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        assertEquals(Status.NOT_DUE, engine.evaluate(need, logs, at("2026-11-26 23:59")).status)
        assertEquals(Status.DUE, engine.evaluate(need, logs, at("2026-11-27 00:00")).status)
        assertEquals(Status.DUE, engine.evaluate(need, logs, at("2026-11-27 23:59")).status)
        assertEquals(Status.OVERDUE, engine.evaluate(need, logs, at("2026-11-28 00:01")).status)
        assertEquals(Status.OVERDUE, engine.evaluate(need, logs, at("2026-12-05 12:00")).status)
    }

    @Test
    fun `the interval counts from when it was actually done`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"), log(need, "Omar", "2026-11-29 08:00"))
        val state = engine.evaluate(need, logs, at("2026-11-30 12:00"))
        assertEquals(Status.NOT_DUE, state.status)
        assertEquals(at("2026-12-02 09:00"), state.nextDueAt)
    }

    @Test
    fun `an explicit first due date is respected`() {
        val need = crickets().copy(schedule = Schedule.EveryDays(7, time("10:00"), firstDue = LocalDate.of(2026, 12, 1)))
        val state = engine.evaluate(need, emptyList(), at("2026-11-27 12:00"))
        assertEquals(Status.NOT_DUE, state.status)
        assertEquals(at("2026-12-01 10:00"), state.nextDueAt)
    }

    @Test
    fun `feeding again the same day warns it is already done`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        val warn = assertIs<GuardVerdict.Warn>(engine.checkLog(need, logs, at("2026-11-24 22:00")))
        assertEquals(GuardReason.ALREADY_DONE, warn.reason)
    }

    @Test
    fun `feeding again the next day warns it is too soon`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        val warn = assertIs<GuardVerdict.Warn>(engine.checkLog(need, logs, at("2026-11-25 10:00")))
        assertEquals(GuardReason.TOO_SOON, warn.reason)
    }

    @Test
    fun `feeding on the due day is allowed`() {
        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-24 20:00"))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-27 09:00")))
    }
}
