package com.harirrou.fedyet.data

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
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * How a home is written to the phone's storage. These classes are the file format:
 * add fields with defaults, never rename or remove one, and unknown fields are ignored on read.
 */
@Serializable
private data class HomeDto(
    val version: Int = 1,
    val id: String,
    val name: String,
    val zone: String,
    val meId: String,
    val members: List<MemberDto>,
    val pets: List<PetDto>,
    val needs: List<NeedDto>,
    val logs: List<LogDto>,
    val supplies: List<SupplyDto> = emptyList(),
    val sample: Boolean = false,
)

@Serializable
private data class MemberDto(val id: String, val name: String, val tint: Long)

@Serializable
private data class PetDto(
    val id: String,
    val name: String,
    val detail: String = "",
    val tint: Long,
    val species: String,
    val photoPath: String? = null,
)

@Serializable
private data class SlotDto(val time: String, val label: String? = null)

/** [type] is one of daily, everyDays, monthly, yearly, once; only that type's fields are used. */
@Serializable
private data class ScheduleDto(
    val type: String,
    val slots: List<SlotDto> = emptyList(),
    val days: Int = 0,
    val at: String? = null,
    val firstDue: String? = null,
    val dayOfMonth: Int = 0,
    val month: Int = 0,
    val dateTime: String? = null,
)

@Serializable
private data class NeedDto(
    val id: String,
    val petId: String,
    val kind: String,
    val label: String,
    val schedule: ScheduleDto,
    val createdAt: Long,
    val guard: String,
    val earlyMinutes: Int,
    val lateMinutes: Int,
    val minGapMinutes: Int? = null,
    val active: Boolean = true,
)

@Serializable
private data class LogDto(val id: String, val needId: String, val by: String, val at: Long, val undone: Boolean = false)

@Serializable
private data class SupplyDto(
    val id: String,
    val label: String,
    val unit: String = "",
    val remaining: Double,
    val perUse: Double,
    val needId: String? = null,
)

object HomeJson {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun encode(home: HomeSnapshot): String = json.encodeToString(HomeDto.serializer(), home.toDto())

    /** Returns null when the text is not a home this version can read. */
    fun decode(text: String): HomeSnapshot? = try {
        json.decodeFromString(HomeDto.serializer(), text).toModel()
    } catch (_: Exception) {
        null
    }

    private fun HomeSnapshot.toDto() = HomeDto(
        id = id,
        name = name,
        zone = zone.id,
        meId = meId,
        members = members.map { MemberDto(it.id, it.name, it.tint) },
        pets = pets.map { PetDto(it.id, it.name, it.detail, it.tint, it.species.name, it.photoPath) },
        needs = needs.map { it.toDto() },
        logs = logs.map { LogDto(it.id, it.needId, it.by, it.at.toEpochMilli(), it.undone) },
        supplies = supplies.map { SupplyDto(it.id, it.label, it.unit, it.remaining, it.perUse, it.needId) },
        sample = isSample,
    )

    private fun HomeDto.toModel() = HomeSnapshot(
        id = id,
        name = name,
        zone = ZoneId.of(zone),
        meId = meId,
        members = members.map { Member(it.id, it.name, it.tint) },
        pets = pets.map {
            Pet(it.id, it.name, it.detail, it.tint, Species.entries.firstOrNull { s -> s.name == it.species } ?: Species.OTHER, it.photoPath)
        },
        needs = needs.map { it.toModel() },
        logs = logs.map { LogEntry(it.id, it.needId, it.by, Instant.ofEpochMilli(it.at), it.undone) },
        supplies = supplies.map { Supply(it.id, it.label, it.unit, it.remaining, it.perUse, it.needId) },
        isSample = sample,
    )

    private fun Need.toDto() = NeedDto(
        id = id,
        petId = petId,
        kind = kind.name,
        label = label,
        schedule = schedule.toDto(),
        createdAt = createdAt.toEpochMilli(),
        guard = guard.name,
        earlyMinutes = earlyMinutes,
        lateMinutes = lateMinutes,
        minGapMinutes = minGapMinutes,
        active = active,
    )

    private fun NeedDto.toModel() = Need(
        id = id,
        petId = petId,
        kind = NeedKind.entries.firstOrNull { it.name == kind } ?: NeedKind.OTHER,
        label = label,
        schedule = schedule.toModel(),
        createdAt = Instant.ofEpochMilli(createdAt),
        guard = Guard.entries.firstOrNull { it.name == guard } ?: Guard.NONE,
        earlyMinutes = earlyMinutes,
        lateMinutes = lateMinutes,
        minGapMinutes = minGapMinutes,
        active = active,
    )

    private fun Schedule.toDto(): ScheduleDto = when (this) {
        is Schedule.Daily -> ScheduleDto("daily", slots = slots.map { SlotDto(it.time.toString(), it.label) })
        is Schedule.EveryDays -> ScheduleDto("everyDays", days = days, at = at.toString(), firstDue = firstDue?.toString())
        is Schedule.Monthly -> ScheduleDto("monthly", dayOfMonth = dayOfMonth, at = at.toString())
        is Schedule.Yearly -> ScheduleDto("yearly", month = month, dayOfMonth = dayOfMonth, at = at.toString())
        is Schedule.Once -> ScheduleDto("once", dateTime = at.toString())
    }

    private fun ScheduleDto.toModel(): Schedule = when (type) {
        "daily" -> Schedule.Daily(slots.map { DailySlot(LocalTime.parse(it.time), it.label) })
        "everyDays" -> Schedule.EveryDays(days, LocalTime.parse(at!!), firstDue?.let(LocalDate::parse))
        "monthly" -> Schedule.Monthly(dayOfMonth, LocalTime.parse(at!!))
        "yearly" -> Schedule.Yearly(month, dayOfMonth, LocalTime.parse(at!!))
        "once" -> Schedule.Once(LocalDateTime.parse(dateTime!!))
        else -> error("Unknown schedule type $type")
    }
}
