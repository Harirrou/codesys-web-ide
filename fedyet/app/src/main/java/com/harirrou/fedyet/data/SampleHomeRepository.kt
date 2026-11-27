package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.DailySlot
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Schedule
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update

/**
 * A made-up home kept in memory, so the board can be tried before sync exists.
 * Tasks earlier today are already ticked by "Sara" and "Omar"; the most recent ones are left open.
 */
class SampleHomeRepository(private val clock: () -> Instant) : HomeRepository {

    private val zone: ZoneId = ZoneId.systemDefault()
    private val state = MutableStateFlow<HomeSnapshot?>(build())
    override val home: StateFlow<HomeSnapshot?> = state

    override suspend fun addLog(needId: String, at: Instant): LogEntry {
        val entry = LogEntry(id = UUID.randomUUID().toString(), needId = needId, by = ME, at = at)
        state.update { it?.copy(logs = it.logs + entry) }
        return entry
    }

    override suspend fun undo(logId: String) {
        state.update { snapshot ->
            snapshot?.copy(logs = snapshot.logs.map { if (it.id == logId) it.copy(undone = true) else it })
        }
    }

    private fun build(): HomeSnapshot {
        val now = clock()
        val today = now.atZone(zone).toLocalDate()
        val created = today.minusDays(7).atStartOfDay(zone).toInstant()

        fun need(id: String, pet: String, kind: NeedKind, label: String, schedule: Schedule) =
            Need(id = id, petId = pet, kind = kind, label = label, schedule = schedule, createdAt = created)

        fun daily(vararg slots: Pair<String, String?>) =
            Schedule.Daily(slots.map { DailySlot(LocalTime.parse(it.first), it.second) })

        val needs = listOf(
            need("luna-meals", "luna", NeedKind.MEAL, "Meals", daily("07:00" to "Breakfast", "18:30" to "Dinner")),
            need("luna-walk", "luna", NeedKind.WALK, "Walk", daily("12:00" to "Midday walk", "17:00" to "Evening walk")),
            need("luna-tablet", "luna", NeedKind.MEDICINE, "Joint tablet", daily("08:00" to null)),
            need("luna-flea", "luna", NeedKind.MEDICINE, "Flea and tick", Schedule.Monthly(1, LocalTime.of(9, 0))),
            need("miso-meals", "miso", NeedKind.MEAL, "Meals", daily("07:00" to "Breakfast", "18:00" to "Dinner")),
            need("miso-litter", "miso", NeedKind.CLEAN, "Litter box", daily("19:00" to null)),
            need("pebble-crickets", "pebble", NeedKind.MEAL, "Crickets", Schedule.EveryDays(3, LocalTime.of(9, 0))),
            need("pebble-mist", "pebble", NeedKind.WATER, "Mist the tank", daily("09:00" to null)),
        )

        val logs = mutableListOf<LogEntry>()
        var turn = 0
        fun add(needId: String, at: Instant) {
            logs += LogEntry("seed-${logs.size}", needId, if (turn++ % 2 == 0) SARA else OMAR, at)
        }
        fun instant(date: LocalDate, time: LocalTime): Instant = ZonedDateTime.of(date, time, zone).toInstant()

        // Daily tasks: yesterday's are all done; today's are done unless they came up in the last three hours.
        val cutoff = now.minus(Duration.ofHours(3))
        for (need in needs) {
            val schedule = need.schedule as? Schedule.Daily ?: continue
            for (date in listOf(today.minusDays(1), today)) {
                for (slot in schedule.slots) {
                    val due = instant(date, slot.time)
                    if (due.isBefore(cutoff)) add(need.id, due.plus(Duration.ofMinutes(8)))
                }
            }
        }
        // The gecko ate yesterday; this month's flea dose was given on the 1st.
        add("pebble-crickets", instant(today.minusDays(1), LocalTime.of(9, 12)))
        val firstOfMonth = instant(today.withDayOfMonth(1), LocalTime.of(9, 20))
        if (firstOfMonth.isBefore(now)) add("luna-flea", firstOfMonth)

        return HomeSnapshot(
            name = "Sample home",
            zone = zone,
            meId = ME,
            members = listOf(
                Member(SARA, "Sara", 0xFFD9E4F5),
                Member(OMAR, "Omar", 0xFFF3DFC4),
                Member(ME, "You", 0xFFD5E8DF),
            ),
            pets = listOf(
                Pet("luna", "Luna", "Dog · Labrador", 0xFF2B5FA8),
                Pet("miso", "Miso", "Cat · indoor", 0xFF7A3E7E),
                Pet("pebble", "Pebble", "Leopard gecko", 0xFF1B7F86),
            ),
            needs = needs,
            logs = logs,
        )
    }

    private companion object {
        const val ME = "me"
        const val SARA = "sara"
        const val OMAR = "omar"
    }
}
