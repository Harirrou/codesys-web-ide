package com.harirrou.fedyet.engine

import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

val NEW_YORK: ZoneId = ZoneId.of("America/New_York")
val PARIS: ZoneId = ZoneId.of("Europe/Paris")

/** "2026-11-27 18:40" in the given zone, as an instant. */
fun at(local: String, zone: ZoneId = NEW_YORK): Instant =
    LocalDateTime.parse(local.replace(' ', 'T')).atZone(zone).toInstant()

fun time(text: String): LocalTime = LocalTime.parse(text)

private var counter = 0

fun log(need: Need, by: String, local: String, zone: ZoneId = NEW_YORK, undone: Boolean = false) =
    LogEntry(id = "log${counter++}", needId = need.id, by = by, at = at(local, zone), undone = undone)

/** Luna's meals: breakfast 07:00, dinner 18:30. Created a week before the test dates. */
fun meals(created: String = "2026-11-20 00:00") = Need(
    id = "meals", petId = "luna", kind = NeedKind.MEAL, label = "Meals",
    schedule = Schedule.Daily(listOf(DailySlot(time("07:00"), "Breakfast"), DailySlot(time("18:30"), "Dinner"))),
    createdAt = at(created),
)

/** Luna's joint tablet: one a day at 08:00. */
fun tablet() = Need(
    id = "tablet", petId = "luna", kind = NeedKind.MEDICINE, label = "Joint tablet",
    schedule = Schedule.Daily(listOf(DailySlot(time("08:00")))),
    createdAt = at("2026-11-20 00:00"),
)

/** A medicine given twice a day, 08:00 and 20:00. */
fun twiceDailyMedicine() = Need(
    id = "drops", petId = "miso", kind = NeedKind.MEDICINE, label = "Eye drops",
    schedule = Schedule.Daily(listOf(DailySlot(time("08:00")), DailySlot(time("20:00")))),
    createdAt = at("2026-11-20 00:00"),
)

fun walk() = Need(
    id = "walk", petId = "luna", kind = NeedKind.WALK, label = "Walk",
    schedule = Schedule.Daily(listOf(DailySlot(time("17:00")))),
    createdAt = at("2026-11-20 00:00"),
)

/** Pebble the gecko: crickets every 3 days at 09:00. */
fun crickets(created: String = "2026-11-20 10:00") = Need(
    id = "crickets", petId = "pebble", kind = NeedKind.MEAL, label = "Crickets",
    schedule = Schedule.EveryDays(3, time("09:00")),
    createdAt = at(created),
)
