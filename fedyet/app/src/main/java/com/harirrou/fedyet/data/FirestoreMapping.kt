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

/**
 * How a home is laid out in Firestore, as plain maps. Kept free of the Firebase SDK so the
 * format can be unit tested. Times are stored as epoch milliseconds.
 *
 *   homes/{homeId}                 name, tz, createdBy, schemaVersion
 *   homes/{homeId}/members/{uid}   name, tint, role, inviteCode
 *   homes/{homeId}/pets/{petId}    name, detail, tint, species      (photos stay on each phone)
 *   homes/{homeId}/needs/{needId}  petId, kind, label, schedule{}, createdAt, guard, windows,
 *                                  active, lastDone{id,at,by}, prevDone{id,at,by}
 *   homes/{homeId}/supplies/{id}   label, unit, remaining, perUse, needId
 *   homes/{homeId}/days/{yyyy-mm-dd}  logs{logId: {needId, by, at, undone}}
 *   invites/{code}                 homeId, role, createdBy, expiresAt
 *
 * lastDone and prevDone let interval, monthly and yearly tasks know when they were last done
 * without reading every day the home has ever had.
 */
object FirestoreMapping {
    const val SCHEMA_VERSION = 1

    fun home(name: String, zone: String, createdBy: String): Map<String, Any?> =
        mapOf("name" to name, "tz" to zone, "createdBy" to createdBy, "schemaVersion" to SCHEMA_VERSION)

    fun member(name: String, tint: Long, role: String, inviteCode: String? = null): Map<String, Any?> =
        buildMap {
            put("name", name)
            put("tint", tint)
            put("role", role)
            if (inviteCode != null) put("inviteCode", inviteCode)
        }

    fun memberFrom(id: String, data: Map<String, Any?>): Member =
        Member(id, data.str("name") ?: "?", data.long("tint") ?: MemberTints[0], data.str("role") ?: ROLE_MEMBER)

    fun pet(pet: Pet): Map<String, Any?> =
        mapOf("name" to pet.name, "detail" to pet.detail, "tint" to pet.tint, "species" to pet.species.name)

    fun petFrom(id: String, data: Map<String, Any?>, photoPath: String?): Pet = Pet(
        id = id,
        name = data.str("name") ?: "?",
        detail = data.str("detail").orEmpty(),
        tint = data.long("tint") ?: PetTints[0],
        species = Species.entries.firstOrNull { it.name == data.str("species") } ?: Species.OTHER,
        photoPath = photoPath,
    )

    /** The need's own fields. lastDone and prevDone are written separately, when tasks are ticked. */
    fun need(need: Need): Map<String, Any?> = mapOf(
        "petId" to need.petId,
        "kind" to need.kind.name,
        "label" to need.label,
        "schedule" to schedule(need.schedule),
        "createdAt" to need.createdAt.toEpochMilli(),
        "guard" to need.guard.name,
        "earlyMinutes" to need.earlyMinutes,
        "lateMinutes" to need.lateMinutes,
        "minGapMinutes" to need.minGapMinutes,
        "active" to need.active,
    )

    /** Null when the document is not a need this version understands. */
    fun needFrom(id: String, data: Map<String, Any?>): Need? = runCatching {
        Need(
            id = id,
            petId = data.str("petId")!!,
            kind = NeedKind.entries.firstOrNull { it.name == data.str("kind") } ?: NeedKind.OTHER,
            label = data.str("label").orEmpty(),
            schedule = scheduleFrom(data.map("schedule")!!),
            createdAt = Instant.ofEpochMilli(data.long("createdAt")!!),
            guard = Guard.entries.firstOrNull { it.name == data.str("guard") } ?: Guard.NONE,
            earlyMinutes = data.long("earlyMinutes")!!.toInt(),
            lateMinutes = data.long("lateMinutes")!!.toInt(),
            minGapMinutes = data.long("minGapMinutes")?.toInt(),
            active = data["active"] as? Boolean ?: true,
        )
    }.getOrNull()

    fun doneRef(log: LogEntry): Map<String, Any?> = mapOf("id" to log.id, "at" to log.at.toEpochMilli(), "by" to log.by)

    /** The last and previous ticks recorded on a need document, as logs. */
    fun doneRefsFrom(needId: String, data: Map<String, Any?>): List<LogEntry> =
        listOf("lastDone", "prevDone").mapNotNull { key ->
            val ref = data.map(key) ?: return@mapNotNull null
            val logId = ref.str("id") ?: return@mapNotNull null
            val at = ref.long("at") ?: return@mapNotNull null
            LogEntry(logId, needId, ref.str("by") ?: "?", Instant.ofEpochMilli(at))
        }

    fun log(log: LogEntry): Map<String, Any?> =
        mapOf("needId" to log.needId, "by" to log.by, "at" to log.at.toEpochMilli(), "undone" to log.undone)

    /** The logs in one day document. Entries this version cannot read are skipped. */
    fun logsFrom(data: Map<String, Any?>): List<LogEntry> {
        val logs = data.map("logs") ?: return emptyList()
        return logs.mapNotNull { (id, value) ->
            @Suppress("UNCHECKED_CAST")
            val entry = value as? Map<String, Any?> ?: return@mapNotNull null
            val needId = entry.str("needId") ?: return@mapNotNull null
            val at = entry.long("at") ?: return@mapNotNull null
            LogEntry(id, needId, entry.str("by") ?: "?", Instant.ofEpochMilli(at), entry["undone"] as? Boolean ?: false)
        }
    }

    /**
     * The logs a home works from: everything in the recent day documents, plus the last and
     * previous tick of each need when those are older than the window.
     */
    fun mergeLogs(window: List<LogEntry>, doneRefs: List<LogEntry>): List<LogEntry> {
        val known = window.map { it.id }.toSet()
        return (window + doneRefs.filter { it.id !in known }.distinctBy { it.id }).sortedBy { it.at }
    }

    fun supply(supply: Supply): Map<String, Any?> = mapOf(
        "label" to supply.label,
        "unit" to supply.unit,
        "remaining" to supply.remaining,
        "perUse" to supply.perUse,
        "needId" to supply.needId,
    )

    fun supplyFrom(id: String, data: Map<String, Any?>): Supply = Supply(
        id = id,
        label = data.str("label").orEmpty(),
        unit = data.str("unit").orEmpty(),
        remaining = data.double("remaining") ?: 0.0,
        perUse = data.double("perUse") ?: 1.0,
        needId = data.str("needId"),
    )

    fun schedule(schedule: Schedule): Map<String, Any?> = when (schedule) {
        is Schedule.Daily -> mapOf(
            "type" to "daily",
            "slots" to schedule.slots.map { mapOf("time" to it.time.toString(), "label" to it.label) },
        )
        is Schedule.EveryDays -> mapOf(
            "type" to "everyDays",
            "days" to schedule.days,
            "at" to schedule.at.toString(),
            "firstDue" to schedule.firstDue?.toString(),
        )
        is Schedule.Monthly -> mapOf("type" to "monthly", "dayOfMonth" to schedule.dayOfMonth, "at" to schedule.at.toString())
        is Schedule.Yearly -> mapOf(
            "type" to "yearly",
            "month" to schedule.month,
            "dayOfMonth" to schedule.dayOfMonth,
            "at" to schedule.at.toString(),
        )
        is Schedule.Once -> mapOf("type" to "once", "dateTime" to schedule.at.toString())
    }

    fun scheduleFrom(data: Map<String, Any?>): Schedule = when (data.str("type")) {
        "daily" -> Schedule.Daily(
            (data["slots"] as List<*>).map {
                @Suppress("UNCHECKED_CAST")
                val slot = it as Map<String, Any?>
                DailySlot(LocalTime.parse(slot.str("time")), slot.str("label"))
            },
        )
        "everyDays" -> Schedule.EveryDays(
            data.long("days")!!.toInt(),
            LocalTime.parse(data.str("at")),
            data.str("firstDue")?.let(LocalDate::parse),
        )
        "monthly" -> Schedule.Monthly(data.long("dayOfMonth")!!.toInt(), LocalTime.parse(data.str("at")))
        "yearly" -> Schedule.Yearly(data.long("month")!!.toInt(), data.long("dayOfMonth")!!.toInt(), LocalTime.parse(data.str("at")))
        "once" -> Schedule.Once(LocalDateTime.parse(data.str("dateTime")))
        else -> error("Unknown schedule type")
    }

    // Firestore hands numbers back as Long or Double whichever way they were written.
    private fun Map<String, Any?>.str(key: String): String? = this[key] as? String
    private fun Map<String, Any?>.long(key: String): Long? = (this[key] as? Number)?.toLong()
    private fun Map<String, Any?>.double(key: String): Double? = (this[key] as? Number)?.toDouble()

    @Suppress("UNCHECKED_CAST")
    private fun Map<String, Any?>.map(key: String): Map<String, Any?>? = this[key] as? Map<String, Any?>
}

/** Codes people read aloud and type: no 0/O or 1/I/L. */
object InviteCodes {
    private const val ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    const val LENGTH = 8

    fun generate(random: java.util.Random = java.security.SecureRandom()): String =
        (1..LENGTH).map { ALPHABET[random.nextInt(ALPHABET.length)] }.joinToString("")

    /** Tidies what someone typed: upper case, without spaces or dashes. */
    fun normalise(typed: String): String = typed.uppercase().filter { it.isLetterOrDigit() }

    fun looksValid(code: String): Boolean = code.length == LENGTH && code.all { it in ALPHABET }
}
