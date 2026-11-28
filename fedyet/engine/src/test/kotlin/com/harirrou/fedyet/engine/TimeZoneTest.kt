package com.harirrou.fedyet.engine

import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

class TimeZoneTest {

    private fun morningMeal(zoneCreated: Instant) = Need(
        id = "breakfast", petId = "luna", kind = NeedKind.MEAL, label = "Breakfast",
        schedule = Schedule.Daily(listOf(DailySlot(time("07:00")))),
        createdAt = zoneCreated,
    )

    @Test
    fun `US clocks go forward - breakfast stays at 7 local time`() {
        val engine = NeedsEngine(NEW_YORK)
        val need = morningMeal(at("2027-03-01 00:00"))
        // Saturday 13 March is standard time (UTC-5); Sunday 14 March is daylight time (UTC-4).
        assertEquals(Instant.parse("2027-03-13T12:00:00Z"), engine.evaluate(need, emptyList(), at("2027-03-13 07:10")).slotDueAt)
        assertEquals(Instant.parse("2027-03-14T11:00:00Z"), engine.evaluate(need, emptyList(), at("2027-03-14 07:10")).slotDueAt)
    }

    @Test
    fun `US clocks go back - breakfast stays at 7 local time`() {
        val engine = NeedsEngine(NEW_YORK)
        val need = morningMeal(at("2027-10-01 00:00"))
        assertEquals(Instant.parse("2027-11-06T11:00:00Z"), engine.evaluate(need, emptyList(), at("2027-11-06 07:10")).slotDueAt)
        assertEquals(Instant.parse("2027-11-07T12:00:00Z"), engine.evaluate(need, emptyList(), at("2027-11-07 07:10")).slotDueAt)
    }

    @Test
    fun `EU clocks go forward - breakfast stays at 7 local time`() {
        val engine = NeedsEngine(PARIS)
        val need = morningMeal(at("2027-03-01 00:00", PARIS))
        assertEquals(Instant.parse("2027-03-27T06:00:00Z"), engine.evaluate(need, emptyList(), at("2027-03-27 07:10", PARIS)).slotDueAt)
        assertEquals(Instant.parse("2027-03-28T05:00:00Z"), engine.evaluate(need, emptyList(), at("2027-03-28 07:10", PARIS)).slotDueAt)
    }

    @Test
    fun `EU clocks go back - breakfast stays at 7 local time`() {
        val engine = NeedsEngine(PARIS)
        val need = morningMeal(at("2027-10-01 00:00", PARIS))
        assertEquals(Instant.parse("2027-10-30T05:00:00Z"), engine.evaluate(need, emptyList(), at("2027-10-30 07:10", PARIS)).slotDueAt)
        assertEquals(Instant.parse("2027-10-31T06:00:00Z"), engine.evaluate(need, emptyList(), at("2027-10-31 07:10", PARIS)).slotDueAt)
    }

    @Test
    fun `a time that does not exist on the night clocks go forward moves to the next valid time`() {
        val engine = NeedsEngine(NEW_YORK)
        val need = Need(
            id = "night", petId = "miso", kind = NeedKind.MEDICINE, label = "Night dose",
            schedule = Schedule.Daily(listOf(DailySlot(time("02:30")))),
            createdAt = at("2027-03-01 00:00"),
        )
        // 02:30 does not exist on 14 March 2027 in New York; it becomes 03:30 daylight time.
        val state = engine.evaluate(need, emptyList(), Instant.parse("2027-03-14T07:40:00Z"))
        assertEquals(Instant.parse("2027-03-14T07:30:00Z"), state.slotDueAt)
        assertEquals(Status.DUE, state.status)
    }

    @Test
    fun `a daily dose stays done and guarded across the 23-hour day`() {
        val engine = NeedsEngine(NEW_YORK)
        val need = tablet().copy(createdAt = at("2027-03-01 00:00"))
        val logs = listOf(log(need, "Sara", "2027-03-13 08:05"))
        // 18:00 the same evening: still this dose.
        assertEquals(Status.DONE, engine.evaluate(need, logs, at("2027-03-13 18:00")).status)
        // 08:00 the next morning is only 22 h 55 min later in real time, and is allowed.
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2027-03-14 08:00")))
    }

    @Test
    fun `the home's day is used, not the traveller's`() {
        val home = NeedsEngine(NEW_YORK)
        // 23:30 on 27 Nov in New York is already 05:30 on 28 Nov in Paris.
        val moment = at("2026-11-27 23:30")
        assertEquals("2026-11-27", home.dayKey(moment))
        assertEquals("2026-11-28", NeedsEngine(PARIS).dayKey(moment))

        val need = crickets()
        val logs = listOf(log(need, "Sara", "2026-11-27 09:10"))
        // Evaluated for the New York home, the gecko is still "done today" late that evening.
        assertEquals(Status.DONE, home.evaluate(need, logs, moment).status)
    }

    @Test
    fun `an interval need counts calendar days across a clock change`() {
        val engine = NeedsEngine(NEW_YORK)
        val need = crickets(created = "2027-03-01 10:00")
        val logs = listOf(log(need, "Sara", "2027-03-12 09:10"))
        val state = engine.evaluate(need, logs, at("2027-03-13 12:00"))
        assertEquals(at("2027-03-15 09:00"), state.nextDueAt)
        assertEquals(Instant.parse("2027-03-15T13:00:00Z"), state.nextDueAt)
    }
}
