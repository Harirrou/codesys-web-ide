package com.harirrou.fedyet.engine

import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class CalendarNeedsTest {
    private val engine = NeedsEngine(NEW_YORK)

    private fun fleaDose(day: Int = 1, created: String = "2026-11-27 12:00") = Need(
        id = "flea", petId = "luna", kind = NeedKind.MEDICINE, label = "Flea and tick",
        schedule = Schedule.Monthly(day, time("09:00")),
        createdAt = at(created),
    )

    private fun vaccine(month: Int, day: Int, created: String) = Need(
        id = "vaccine", petId = "miso", kind = NeedKind.MEDICINE, label = "Vaccine",
        schedule = Schedule.Yearly(month, day, time("10:00")),
        createdAt = at(created),
    )

    @Test
    fun `a monthly dose is not due until three days before`() {
        val need = fleaDose()
        val early = engine.evaluate(need, emptyList(), at("2026-11-27 13:00"))
        assertEquals(Status.NOT_DUE, early.status)
        assertEquals(at("2026-12-01 09:00"), early.nextDueAt)
        assertEquals(Status.NOT_DUE, engine.evaluate(need, emptyList(), at("2026-11-28 08:59")).status)
        assertEquals(Status.DUE, engine.evaluate(need, emptyList(), at("2026-11-28 09:00")).status)
    }

    @Test
    fun `a monthly dose is overdue from the day after`() {
        val need = fleaDose()
        assertEquals(Status.DUE, engine.evaluate(need, emptyList(), at("2026-12-01 23:59")).status)
        assertEquals(Status.OVERDUE, engine.evaluate(need, emptyList(), at("2026-12-02 00:01")).status)
    }

    @Test
    fun `a monthly dose given on the day is done and points at next month`() {
        val need = fleaDose()
        val logs = listOf(log(need, "Sara", "2026-12-01 09:30"))
        val state = engine.evaluate(need, logs, at("2026-12-10 12:00"))
        assertEquals(Status.DONE, state.status)
        assertEquals(at("2027-01-01 09:00"), state.nextDueAt)
    }

    @Test
    fun `day 31 falls on the last day of shorter months`() {
        val need = fleaDose(day = 31, created = "2027-01-15 12:00")
        assertEquals(at("2027-01-31 09:00"), engine.evaluate(need, emptyList(), at("2027-01-31 10:00")).slotDueAt)
        assertEquals(at("2027-02-28 09:00"), engine.evaluate(need, emptyList(), at("2027-02-28 10:00")).slotDueAt)
        assertEquals(at("2027-04-30 09:00"), engine.evaluate(need, emptyList(), at("2027-04-30 10:00")).slotDueAt)
    }

    @Test
    fun `a second monthly dose a week later needs confirming`() {
        val need = fleaDose()
        val logs = listOf(log(need, "Sara", "2026-12-01 09:30"))
        val verdict = assertIs<GuardVerdict.ConfirmRequired>(engine.checkLog(need, logs, at("2026-12-08 09:00")))
        assertEquals(GuardReason.ALREADY_DONE, verdict.reason)
    }

    @Test
    fun `a late dose still warns when the next one comes round too soon`() {
        val need = fleaDose(created = "2026-10-20 12:00")
        // November's dose was missed and given on the 20th; December's is 11 days later.
        val logs = listOf(log(need, "Sara", "2026-11-20 09:00"))
        assertEquals(Status.DUE, engine.evaluate(need, logs, at("2026-12-01 09:00")).status)
        val verdict = assertIs<GuardVerdict.ConfirmRequired>(engine.checkLog(need, logs, at("2026-12-01 09:00")))
        assertEquals(GuardReason.TOO_SOON, verdict.reason)
    }

    @Test
    fun `a yearly need on 29 February uses the 28th in ordinary years`() {
        val need = vaccine(2, 29, created = "2026-06-01 12:00")
        assertEquals(at("2027-02-28 10:00"), engine.evaluate(need, emptyList(), at("2027-02-28 11:00")).slotDueAt)
        assertEquals(at("2028-02-29 10:00"), engine.evaluate(need, emptyList(), at("2028-02-29 11:00")).slotDueAt)
    }

    @Test
    fun `a yearly need shows two weeks ahead`() {
        val need = vaccine(3, 15, created = "2026-06-01 12:00")
        assertEquals(Status.NOT_DUE, engine.evaluate(need, emptyList(), at("2027-02-20 12:00")).status)
        assertEquals(Status.DUE, engine.evaluate(need, emptyList(), at("2027-03-01 10:00")).status)
        assertEquals(at("2027-03-15 10:00"), engine.evaluate(need, emptyList(), at("2027-02-20 12:00")).nextDueAt)
    }

    @Test
    fun `a one-off need goes from not due to due to done and stays done`() {
        val need = Need(
            id = "vet", petId = "luna", kind = NeedKind.OTHER, label = "Vet visit",
            schedule = Schedule.Once(LocalDateTime.parse("2026-12-05T15:00")),
            createdAt = at("2026-11-27 12:00"),
        )
        assertEquals(Status.NOT_DUE, engine.evaluate(need, emptyList(), at("2026-12-05 13:00")).status)
        assertEquals(Status.DUE, engine.evaluate(need, emptyList(), at("2026-12-05 14:00")).status)
        assertEquals(Status.OVERDUE, engine.evaluate(need, emptyList(), at("2026-12-05 16:01")).status)
        val logs = listOf(log(need, "You", "2026-12-05 15:10"))
        val muchLater = engine.evaluate(need, logs, at("2027-12-05 15:10"))
        assertEquals(Status.DONE, muchLater.status)
        assertEquals(null, muchLater.nextDueAt)
    }
}
