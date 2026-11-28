package com.harirrou.fedyet

import com.harirrou.fedyet.data.HomeEdits
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Member
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.PetTints
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.engine.DailySlot
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Schedule
import com.harirrou.fedyet.reminders.ReminderPlanner
import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class ReminderPlannerTest {
    private val zone: ZoneId = ZoneId.of("America/New_York")
    private fun at(text: String): Instant = LocalDateTime.parse(text).atZone(zone).toInstant()

    /** Rex, with dinner at 18:30 (overdue from 20:00) and a gecko-style task every 3 days. */
    private val home = HomeSnapshot(
        id = "h",
        name = "Home",
        zone = zone,
        meId = "me",
        members = listOf(Member("me", "Ali", 0)),
        pets = listOf(Pet("rex", "Rex", "", PetTints[0], Species.DOG)),
        needs = listOf(
            Need(
                "dinner", "rex", NeedKind.MEAL, "Meals",
                Schedule.Daily(listOf(DailySlot(LocalTime.of(18, 30), "Dinner"))),
                at("2026-11-20T00:00"),
            ),
        ),
        logs = emptyList(),
    )

    @Test
    fun `nothing is said before the due time, even inside the window`() {
        assertTrue(ReminderPlanner.dueNow(home, at("2026-11-27T17:30")).isEmpty())
        assertEquals(at("2026-11-27T18:30"), ReminderPlanner.nextWakeAt(home, at("2026-11-27T17:30")))
    }

    @Test
    fun `at the due time an undone task is announced by pet and occasion`() {
        val notice = ReminderPlanner.dueNow(home, at("2026-11-27T18:30")).single()
        assertEquals("Rex", notice.petName)
        assertEquals("Dinner", notice.title)
        assertFalse(notice.overdue)
        assertEquals(at("2026-11-27T20:00"), ReminderPlanner.nextWakeAt(home, at("2026-11-27T18:30")))
    }

    @Test
    fun `once overdue it is announced again as overdue, with a different key`() {
        val due = ReminderPlanner.dueNow(home, at("2026-11-27T18:31")).single()
        val overdue = ReminderPlanner.dueNow(home, at("2026-11-27T20:01")).single()
        assertTrue(overdue.overdue)
        assertNotEquals(due.key, overdue.key)
        // The same stage of the same occasion always has the same key, so it is said once.
        assertEquals(overdue.key, ReminderPlanner.dueNow(home, at("2026-11-27T22:00")).single().key)
    }

    @Test
    fun `when someone does it the reminder goes away and the next one is tomorrow`() {
        val done = HomeEdits.addLog(home, LogEntry("x", "dinner", "me", at("2026-11-27T18:20")))
        assertTrue(ReminderPlanner.dueNow(done, at("2026-11-27T18:30")).isEmpty())
        assertEquals(at("2026-11-28T18:30"), ReminderPlanner.nextWakeAt(done, at("2026-11-27T18:30")))
    }

    @Test
    fun `tomorrow's dinner has a new key`() {
        val today = ReminderPlanner.dueNow(home, at("2026-11-27T18:31")).single()
        val tomorrow = ReminderPlanner.dueNow(home, at("2026-11-28T18:31")).single()
        assertNotEquals(today.key, tomorrow.key)
    }

    @Test
    fun `a paused task never reminds`() {
        val paused = home.copy(needs = home.needs.map { it.copy(active = false) })
        assertTrue(ReminderPlanner.dueNow(paused, at("2026-11-27T19:00")).isEmpty())
        assertEquals(null, ReminderPlanner.nextWakeAt(paused, at("2026-11-27T19:00")))
    }

    @Test
    fun `with several tasks the alarm is set for the earliest`() {
        val walk = Need(
            "walk", "rex", NeedKind.WALK, "Walk",
            Schedule.Daily(listOf(DailySlot(LocalTime.of(17, 0)))),
            at("2026-11-20T00:00"),
        )
        val both = home.copy(needs = home.needs + walk)
        assertEquals(at("2026-11-27T17:00"), ReminderPlanner.nextWakeAt(both, at("2026-11-27T12:00")))
    }
}
