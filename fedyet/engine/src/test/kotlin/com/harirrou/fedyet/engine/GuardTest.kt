package com.harirrou.fedyet.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

class GuardTest {
    private val engine = NeedsEngine(NEW_YORK)

    @Test
    fun `first log of the day goes straight through`() {
        assertEquals(GuardVerdict.Allowed, engine.checkLog(meals(), emptyList(), at("2026-11-27 07:05")))
    }

    @Test
    fun `a second breakfast gets a warning naming the first`() {
        val need = meals()
        val first = log(need, "Sara", "2026-11-27 07:10")
        val verdict = engine.checkLog(need, listOf(first), at("2026-11-27 11:00"))
        val warn = assertIs<GuardVerdict.Warn>(verdict)
        assertEquals(GuardReason.ALREADY_DONE, warn.reason)
        assertEquals("Sara", warn.previous.by)
    }

    @Test
    fun `dinner a little early after a normal breakfast is allowed`() {
        val need = meals()
        val logs = listOf(log(need, "Sara", "2026-11-27 07:10"))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-27 16:55")))
    }

    @Test
    fun `dinner soon after a very late breakfast warns that it is too soon`() {
        val need = meals()
        val logs = listOf(log(need, "Omar", "2026-11-27 13:00"))
        val warn = assertIs<GuardVerdict.Warn>(engine.checkLog(need, logs, at("2026-11-27 17:00")))
        assertEquals(GuardReason.TOO_SOON, warn.reason)
    }

    @Test
    fun `a second tablet the same day needs confirming`() {
        val need = tablet()
        val logs = listOf(log(need, "Sara", "2026-11-27 08:05"))
        for (moment in listOf("2026-11-27 08:06", "2026-11-27 19:00", "2026-11-27 21:00", "2026-11-28 04:00")) {
            val verdict = assertIs<GuardVerdict.ConfirmRequired>(engine.checkLog(need, logs, at(moment)), moment)
            assertEquals(GuardReason.ALREADY_DONE, verdict.reason, moment)
            assertEquals("Sara", verdict.previous.by)
        }
    }

    @Test
    fun `tomorrow's tablet is allowed tomorrow morning`() {
        val need = tablet()
        val logs = listOf(log(need, "Sara", "2026-11-27 08:05"))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-28 06:30")))
    }

    @Test
    fun `evening medicine too soon after a late morning dose needs confirming`() {
        val need = twiceDailyMedicine()
        val logs = listOf(log(need, "Sara", "2026-11-27 15:00"))
        val verdict = assertIs<GuardVerdict.ConfirmRequired>(engine.checkLog(need, logs, at("2026-11-27 20:00")))
        assertEquals(GuardReason.TOO_SOON, verdict.reason)
    }

    @Test
    fun `evening medicine after an on-time morning dose is allowed`() {
        val need = twiceDailyMedicine()
        val logs = listOf(log(need, "Sara", "2026-11-27 08:10"))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-27 19:45")))
    }

    @Test
    fun `an undone tablet does not block the real one`() {
        val need = tablet()
        val logs = listOf(log(need, "Sara", "2026-11-27 08:05", undone = true))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-27 08:10")))
    }

    @Test
    fun `walks are never guarded`() {
        val need = walk()
        val logs = listOf(log(need, "Omar", "2026-11-27 17:10"))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-27 17:20")))
    }

    @Test
    fun `two people logging the same dinner offline is flagged as done twice`() {
        val need = meals()
        val logs = listOf(
            log(need, "Sara", "2026-11-27 07:10"),
            log(need, "Sara", "2026-11-27 18:40"),
            log(need, "Omar", "2026-11-27 18:41"),
        )
        val state = engine.evaluate(need, logs, at("2026-11-27 18:45"))
        assertEquals(2, state.slotLogs.size)
        assertEquals("Sara", state.doneLog?.by)
        assertTrue(engine.isDoneTwice(need, logs, at("2026-11-27 18:45")))
    }

    @Test
    fun `two walks in one evening are not a mistake`() {
        val need = walk()
        val logs = listOf(log(need, "Omar", "2026-11-27 17:10"), log(need, "You", "2026-11-27 18:00"))
        assertFalse(engine.isDoneTwice(need, logs, at("2026-11-27 18:05")))
    }

    @Test
    fun `a custom gap overrides the default`() {
        val need = meals().copy(minGapMinutes = 60)
        val logs = listOf(log(need, "Omar", "2026-11-27 13:00"))
        assertEquals(GuardVerdict.Allowed, engine.checkLog(need, logs, at("2026-11-27 17:00")))
    }
}
