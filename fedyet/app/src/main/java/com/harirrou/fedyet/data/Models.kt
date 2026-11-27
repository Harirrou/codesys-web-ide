package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.ZoneId

data class Member(val id: String, val name: String, val tint: Long)

/** The kind of animal. Picks the default picture and, later, the task presets. */
enum class Species { DOG, CAT, RABBIT, GUINEA_PIG, HAMSTER, BIRD, FISH, REPTILE, HORSE, CHICKEN, OTHER }

/** [detail] is the short line under the name, e.g. "Dog · Labrador". */
data class Pet(val id: String, val name: String, val detail: String, val tint: Long, val species: Species)

/** Everything the board needs about one home, at one moment. */
data class HomeSnapshot(
    val name: String,
    val zone: ZoneId,
    val meId: String,
    val members: List<Member>,
    val pets: List<Pet>,
    val needs: List<Need>,
    val logs: List<LogEntry>,
) {
    fun member(id: String): Member? = members.firstOrNull { it.id == id }
}
