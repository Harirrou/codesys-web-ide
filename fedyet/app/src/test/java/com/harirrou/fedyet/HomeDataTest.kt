package com.harirrou.fedyet

import com.harirrou.fedyet.data.CsvExport
import com.harirrou.fedyet.data.HomeEdits
import com.harirrou.fedyet.data.HomeJson
import com.harirrou.fedyet.data.LocalHomeRepository
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.PetTints
import com.harirrou.fedyet.data.Presets
import com.harirrou.fedyet.data.SampleHome
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.data.Supply
import com.harirrou.fedyet.engine.DailySlot
import com.harirrou.fedyet.engine.Guard
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Schedule
import com.harirrou.fedyet.ui.supplies.daysLeft
import com.harirrou.fedyet.ui.upcoming.UpcomingPresenter
import java.io.File
import java.nio.file.Files
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

class HomeDataTest {
    private val zone: ZoneId = ZoneId.of("Europe/Paris")
    private fun at(text: String): Instant = LocalDateTime.parse(text).atZone(zone).toInstant()
    private val now = at("2026-11-27T18:40")
    private val sample = SampleHome.build(now, zone)

    // ---- Saving and loading ----

    @Test
    fun `a home survives being written and read back`() {
        assertEquals(sample, HomeJson.decode(HomeJson.encode(sample)))
    }

    @Test
    fun `every kind of schedule survives being written and read back`() {
        val schedules = listOf(
            Schedule.Daily(listOf(DailySlot(LocalTime.of(7, 0), "Breakfast"), DailySlot(LocalTime.of(18, 30)))),
            Schedule.EveryDays(3, LocalTime.of(9, 0)),
            Schedule.EveryDays(7, LocalTime.of(10, 0), LocalDate.of(2026, 12, 1)),
            Schedule.Monthly(31, LocalTime.of(9, 0)),
            Schedule.Yearly(2, 29, LocalTime.of(10, 0)),
            Schedule.Once(LocalDateTime.parse("2026-12-05T15:00")),
        )
        val needs = schedules.mapIndexed { i, s ->
            Need("n$i", "luna", NeedKind.MEDICINE, "Task $i", s, now, guard = Guard.HARD, minGapMinutes = if (i == 0) 60 else null, active = i != 1)
        }
        val home = sample.copy(needs = needs, logs = emptyList(), supplies = emptyList())
        assertEquals(home, HomeJson.decode(HomeJson.encode(home)))
    }

    @Test
    fun `text that is not a home reads as nothing instead of crashing`() {
        assertNull(HomeJson.decode("not json"))
        assertNull(HomeJson.decode("{}"))
    }

    @Test
    fun `a file from a newer version with extra fields still loads`() {
        val withExtra = HomeJson.encode(sample).replaceFirst("{", "{\"somethingNew\":42,")
        assertEquals(sample, HomeJson.decode(withExtra))
    }

    @Test
    fun `the repository keeps a home on disk between runs`() = runBlocking {
        val folder = Files.createTempDirectory("fedyet").toFile()
        val file = File(folder, "home.json")
        val scope = CoroutineScope(Dispatchers.Unconfined)

        val first = LocalHomeRepository(file, { now }, scope, Dispatchers.Unconfined) { zone }
        first.load()
        assertNull(first.home.value)
        first.createHome("Our home", "Ali")
        val pet = Pet("p1", "Rex", "", PetTints[0], Species.DOG)
        val need = Need("n1", "p1", NeedKind.MEAL, "Meals", Schedule.Daily(listOf(DailySlot(LocalTime.of(18, 30)))), now.minusSeconds(86_400))
        first.savePet(pet, listOf(need))
        val entry = assertNotNull(first.addLog("n1", now))
        assertNull(first.addLog("no-such-task", now))

        val second = LocalHomeRepository(file, { now }, scope, Dispatchers.Unconfined) { zone }
        second.load()
        val loaded = assertNotNull(second.home.value)
        assertEquals("Our home", loaded.name)
        assertEquals("Ali", loaded.member(loaded.meId)?.name)
        assertEquals(listOf(pet), loaded.pets)
        assertEquals(listOf(entry), loaded.logs)

        second.deleteEverything()
        assertNull(second.home.value)
        assertFalse(file.exists())
        folder.deleteRecursively()
        Unit
    }

    // ---- Edits ----

    @Test
    fun `ticking a task uses up its supply and undo puts it back`() {
        val kibble = { home: com.harirrou.fedyet.data.HomeSnapshot -> home.supply("kibble")!!.remaining }
        assertEquals(24.0, kibble(sample))
        val logged = HomeEdits.addLog(sample, LogEntry("x", "luna-meals", SampleHome.ME, now))
        assertEquals(22.0, kibble(logged))
        val undone = HomeEdits.undo(logged, "x")
        assertEquals(24.0, kibble(undone))
        // Undoing the same log twice must not add stock twice.
        assertEquals(24.0, kibble(HomeEdits.undo(undone, "x")))
    }

    @Test
    fun `a supply never goes below zero`() {
        val low = sample.copy(supplies = listOf(Supply("kibble", "Kibble", "cups", 1.0, 2.0, "luna-meals")))
        assertEquals(0.0, HomeEdits.addLog(low, LogEntry("x", "luna-meals", SampleHome.ME, now)).supply("kibble")!!.remaining)
    }

    @Test
    fun `deleting a pet removes its tasks and history but keeps the supply`() {
        val without = HomeEdits.deletePet(sample, "luna")
        assertEquals(listOf("Miso", "Pebble"), without.pets.map { it.name })
        assertTrue(without.needs.none { it.petId == "luna" })
        assertTrue(without.logs.none { it.needId.startsWith("luna-") })
        assertNull(without.supply("kibble")!!.needId)
    }

    @Test
    fun `saving a pet again replaces it instead of adding a second one`() {
        val renamed = HomeEdits.savePet(sample, sample.pet("luna")!!.copy(name = "Lulu"))
        assertEquals(3, renamed.pets.size)
        assertEquals("Lulu", renamed.pet("luna")!!.name)
    }

    @Test
    fun `old history is dropped but each task keeps its latest log`() {
        val old = LogEntry("old", "luna-flea", "sara", at("2026-01-01T09:00"))
        val older = LogEntry("older", "luna-flea", "sara", at("2025-12-01T09:00"))
        val home = sample.copy(logs = listOf(older, old))
        assertEquals(listOf(old), HomeEdits.prune(home, now).logs)
    }

    // ---- Suggested tasks ----

    @Test
    fun `every kind of animal has suggested tasks with distinct keys`() {
        for (species in Species.entries) {
            val presets = Presets.forSpecies(species)
            assertTrue(presets.isNotEmpty(), species.name)
            assertEquals(presets.size, presets.map { it.key }.distinct().size, species.name)
            assertTrue(presets.any { it.suggested }, species.name)
        }
    }

    @Test
    fun `a suggested task becomes a real task with sensible guards`() {
        val text: (Int) -> String = { "text$it" }
        val dog = Presets.forSpecies(Species.DOG).associateBy { it.key }
        val meals = Presets.toNeed(dog.getValue("meals"), "p1", now, text)
        assertEquals(Guard.SOFT, meals.guard)
        assertEquals(2, (meals.schedule as Schedule.Daily).slots.size)
        assertEquals(Guard.HARD, Presets.toNeed(dog.getValue("flea"), "p1", now, text).guard)
        assertEquals(Guard.NONE, Presets.toNeed(dog.getValue("walks"), "p1", now, text).guard)
        val gecko = Presets.toNeed(Presets.forSpecies(Species.REPTILE).first { it.key == "food" }, "p2", now, text)
        assertEquals(Schedule.EveryDays(3, LocalTime.of(9, 0)), gecko.schedule)
    }

    // ---- Supplies and upcoming ----

    @Test
    fun `days left follow the linked task's schedule`() {
        assertEquals(6, daysLeft(sample, sample.supply("kibble")!!))    // 24 cups, 2 a meal, 2 meals a day
        assertEquals(24, daysLeft(sample, sample.supply("tablets")!!))  // 24 tablets, one a day
        assertEquals(15, daysLeft(sample, sample.supply("crickets")!!)) // 30 crickets, 6 every 3 days
        assertNull(daysLeft(sample, Supply("x", "Loose", "", 5.0, 1.0, null)))
    }

    @Test
    fun `upcoming lists overdue first, then by time, and leaves out paused tasks`() {
        val items = UpcomingPresenter.present(sample, now)
        assertTrue(items.first().overdue)
        assertEquals("Evening walk", items.first().title)
        val rest = items.dropWhile { it.overdue }
        assertEquals(rest.sortedBy { it.dueAt }, rest)
        assertTrue(items.any { it.title == "Flea and tick" })

        // Once dinner is ticked, the meals entry is tomorrow's breakfast, by name.
        val fed = HomeEdits.addLog(sample, LogEntry("x", "luna-meals", SampleHome.ME, now))
        val meals = UpcomingPresenter.present(fed, now).first { it.needId == "luna-meals" }
        assertEquals("Breakfast", meals.title)
        assertFalse(meals.dueNow)

        val paused = sample.copy(needs = sample.needs.map { if (it.id == "luna-flea") it.copy(active = false) else it })
        assertTrue(UpcomingPresenter.present(paused, now).none { it.title == "Flea and tick" })
    }

    // ---- Export ----

    @Test
    fun `the export has one line per log and survives awkward names`() {
        val home = sample.copy(
            pets = sample.pets.map { if (it.id == "luna") it.copy(name = "Luna, \"the dog\"") else it },
            logs = listOf(
                LogEntry("a", "luna-meals", "sara", at("2026-11-27T07:08")),
                LogEntry("b", "luna-meals", SampleHome.ME, at("2026-11-27T18:40"), undone = true),
            ),
        )
        val lines = CsvExport.history(home).trim().split("\r\n")
        assertEquals("date,time,pet,task,who,note", lines[0])
        assertEquals("2026-11-27,07:08,\"Luna, \"\"the dog\"\"\",Meals,Sara,", lines[1])
        assertEquals("2026-11-27,18:40,\"Luna, \"\"the dog\"\"\",Meals,You,undone", lines[2])
        assertEquals(3, lines.size)
    }

    @Test
    fun `the export blunts text that a spreadsheet would run as a formula`() {
        val home = sample.copy(
            needs = sample.needs.map { if (it.id == "luna-meals") it.copy(label = "=SUM(A1)") else it },
            logs = listOf(LogEntry("a", "luna-meals", "sara", at("2026-11-27T07:08"))),
        )
        assertTrue(CsvExport.history(home).contains(",'=SUM(A1),"))
    }
}
