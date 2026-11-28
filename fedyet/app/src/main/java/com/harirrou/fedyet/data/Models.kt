package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.ZoneId

/** [role] is "owner", "member" or "sitter". A home kept only on this phone has one owner. */
data class Member(val id: String, val name: String, val tint: Long, val role: String = ROLE_OWNER)

const val ROLE_OWNER = "owner"
const val ROLE_MEMBER = "member"

/** The kind of animal. Picks the default picture and the suggested tasks. */
enum class Species { DOG, CAT, RABBIT, GUINEA_PIG, HAMSTER, BIRD, FISH, REPTILE, HORSE, CHICKEN, OTHER }

/**
 * @param detail the short line under the name, e.g. "Labrador".
 * @param photoPath a picture the owner chose, stored in the app's own files; null shows the species picture.
 */
data class Pet(
    val id: String,
    val name: String,
    val detail: String,
    val tint: Long,
    val species: Species,
    val photoPath: String? = null,
)

/**
 * Something that runs out: food, litter, medicine.
 *
 * @param remaining how much is left, in [unit]s.
 * @param perUse how much one tick of the linked task uses.
 * @param needId the task that uses it up; ticking that task lowers [remaining].
 */
data class Supply(
    val id: String,
    val label: String,
    val unit: String,
    val remaining: Double,
    val perUse: Double,
    val needId: String? = null,
)

/** Everything the app knows about one home, at one moment. */
data class HomeSnapshot(
    val id: String,
    val name: String,
    val zone: ZoneId,
    val meId: String,
    val members: List<Member>,
    val pets: List<Pet>,
    val needs: List<Need>,
    val logs: List<LogEntry>,
    val supplies: List<Supply> = emptyList(),
    val isSample: Boolean = false,
    /** True when the home lives in the cloud and is shared between phones. */
    val synced: Boolean = false,
) {
    fun member(id: String): Member? = members.firstOrNull { it.id == id }

    /** Whether the person using this phone owns the home (and so may delete it) or only belongs to it. */
    val iAmOwner: Boolean get() = member(meId)?.role != ROLE_MEMBER
    fun pet(id: String): Pet? = pets.firstOrNull { it.id == id }
    fun need(id: String): Need? = needs.firstOrNull { it.id == id }
    fun supply(id: String): Supply? = supplies.firstOrNull { it.id == id }
}

/** The colours offered for a pet. The first is the default. */
val PetTints: List<Long> = listOf(0xFF5BB0FF, 0xFFC395FF, 0xFF3DDBC6, 0xFFFFB454, 0xFFFF8FB1, 0xFF9BE15D)

/** The colours given to people, in the order they join. */
val MemberTints: List<Long> = listOf(0xFF6EE7B7, 0xFF7FB2FF, 0xFFFFC073, 0xFFC395FF, 0xFFFF8FB1)
