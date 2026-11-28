package com.harirrou.fedyet

import com.harirrou.fedyet.data.FirestoreMapping
import com.harirrou.fedyet.data.InviteCodes
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.PetTints
import com.harirrou.fedyet.data.SampleHome
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.data.Supply
import com.harirrou.fedyet.engine.DailySlot
import com.harirrou.fedyet.engine.Guard
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Schedule
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.util.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FirestoreMappingTest {
    private val now = Instant.parse("2026-11-27T18:40:00Z")

    /** Firestore gives whole numbers back as Long, whatever was written. */
    @Suppress("UNCHECKED_CAST")
    private fun asStored(value: Any?): Any? = when (value) {
        is Int -> value.toLong()
        is Map<*, *> -> value.mapValues { asStored(it.value) }
        is List<*> -> value.map(::asStored)
        else -> value
    }

    @Suppress("UNCHECKED_CAST")
    private fun stored(map: Map<String, Any?>) = asStored(map) as Map<String, Any?>

    @Test
    fun `every kind of need survives the trip to Firestore and back`() {
        val schedules = listOf(
            Schedule.Daily(listOf(DailySlot(LocalTime.of(7, 0), "Breakfast"), DailySlot(LocalTime.of(18, 30)))),
            Schedule.EveryDays(3, LocalTime.of(9, 0)),
            Schedule.EveryDays(7, LocalTime.of(10, 0), LocalDate.of(2026, 12, 1)),
            Schedule.Monthly(31, LocalTime.of(9, 0)),
            Schedule.Yearly(2, 29, LocalTime.of(10, 0)),
            Schedule.Once(LocalDateTime.parse("2026-12-05T15:00")),
        )
        schedules.forEachIndexed { i, schedule ->
            val need = Need("n$i", "luna", NeedKind.MEDICINE, "Task $i", schedule, now, guard = Guard.HARD, minGapMinutes = if (i == 0) 60 else null, active = i != 1)
            assertEquals(need, FirestoreMapping.needFrom(need.id, stored(FirestoreMapping.need(need))))
        }
    }

    @Test
    fun `a need this version cannot read is skipped instead of crashing`() {
        assertNull(FirestoreMapping.needFrom("x", mapOf("label" to "broken")))
        assertNull(FirestoreMapping.needFrom("x", stored(FirestoreMapping.need(SampleHome.build(now, ZoneId.of("UTC")).needs[0])) + ("schedule" to mapOf("type" to "lunar"))))
    }

    @Test
    fun `pets, supplies and members survive the trip`() {
        val pet = Pet("p1", "Rex", "Beagle", PetTints[2], Species.REPTILE, photoPath = "/local/only.jpg")
        assertEquals(pet, FirestoreMapping.petFrom("p1", stored(FirestoreMapping.pet(pet)), "/local/only.jpg"))
        assertFalse("photoPath" in FirestoreMapping.pet(pet), "photo paths stay on the phone")

        val supply = Supply("s1", "Kibble", "cups", 22.5, 2.0, "n1")
        assertEquals(supply, FirestoreMapping.supplyFrom("s1", stored(FirestoreMapping.supply(supply))))
        // Firestore may hand a whole number back for a Double field.
        assertEquals(22.0, FirestoreMapping.supplyFrom("s1", mapOf("label" to "K", "remaining" to 22L, "perUse" to 2L)).remaining)

        val member = FirestoreMapping.memberFrom("u1", stored(FirestoreMapping.member("Ali", 0xFF6EE7B7, "member", "ABCD2345")))
        assertEquals("Ali", member.name)
        assertEquals("member", member.role)
    }

    @Test
    fun `a day document's logs are read back, undone ones included`() {
        val a = LogEntry("a", "n1", "u1", now)
        val b = LogEntry("b", "n2", "u2", now.plusSeconds(60), undone = true)
        val day = stored(mapOf("logs" to mapOf(a.id to FirestoreMapping.log(a), b.id to FirestoreMapping.log(b), "junk" to "x")))
        assertEquals(setOf(a, b), FirestoreMapping.logsFrom(day).toSet())
        assertTrue(FirestoreMapping.logsFrom(emptyMap()).isEmpty())
    }

    @Test
    fun `old ticks kept on the need fill in what the recent window does not have`() {
        val recent = LogEntry("r", "n1", "u1", now)
        val old = LogEntry("o", "n1", "u2", now.minusSeconds(60L * 86_400))
        val needDoc = stored(mapOf("lastDone" to FirestoreMapping.doneRef(recent), "prevDone" to FirestoreMapping.doneRef(old)))
        val refs = FirestoreMapping.doneRefsFrom("n1", needDoc)
        assertEquals(listOf(recent, old), refs)
        // The recent tick is already in the window, so it is not counted twice.
        assertEquals(listOf(old, recent), FirestoreMapping.mergeLogs(listOf(recent), refs))
    }

    @Test
    fun `invite codes are easy to read and type`() {
        val random = Random(42)
        repeat(200) {
            val code = InviteCodes.generate(random)
            assertTrue(InviteCodes.looksValid(code), code)
            assertTrue(code.none { it in "01OIL" }, code)
        }
        assertEquals("ABCD2345", InviteCodes.normalise(" abcd-2345 "))
        assertFalse(InviteCodes.looksValid("ABCD234"))
        assertFalse(InviteCodes.looksValid("ABCD2340"))
    }
}
