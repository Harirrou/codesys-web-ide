package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.Instant
import kotlinx.coroutines.flow.StateFlow

enum class JoinResult { JOINED, NOT_FOUND, EXPIRED, OFFLINE, NOT_AVAILABLE }

/**
 * The home the user is in, and every way to change it.
 *
 * This interface is the seam between the screens and storage. Today it is backed by a file on
 * the phone ([LocalHomeRepository]); build step 2 adds a Firestore-backed one with the same
 * methods, so no screen has to change.
 */
interface HomeRepository {
    /** False until storage has been read. */
    val ready: StateFlow<Boolean>

    /** Null when the user has not started or joined a home yet. */
    val home: StateFlow<HomeSnapshot?>

    suspend fun createHome(homeName: String, myName: String)
    suspend fun createSampleHome()
    suspend fun renameHome(name: String)
    suspend fun renameMe(name: String)

    /** Records that the current user did [needId] at [at]. */
    suspend fun addLog(needId: String, at: Instant): LogEntry?

    /** Marks a log as undone. Logs are never deleted. */
    suspend fun undo(logId: String)

    /** Adds the pet, or replaces the one with the same id. [newNeeds] are tasks to create with it. */
    suspend fun savePet(pet: Pet, newNeeds: List<Need> = emptyList())
    suspend fun deletePet(petId: String)

    suspend fun saveNeed(need: Need)
    suspend fun deleteNeed(needId: String)

    suspend fun saveSupply(supply: Supply)
    suspend fun deleteSupply(supplyId: String)

    /**
     * Removes the home. For its owner that deletes it for everyone; for anyone else it
     * means leaving it. A home kept only on this phone is simply deleted.
     */
    suspend fun deleteEverything()

    /** Whether homes can be shared between phones on this build. */
    val canSync: Boolean get() = false

    /** A code someone else can type to join this home, or null if sharing is not possible. */
    suspend fun createInvite(): String? = null

    /** Joins the home an invite code belongs to. */
    suspend fun joinHome(code: String, myName: String): JoinResult = JoinResult.NOT_AVAILABLE

    /** Every log the home has, for export. May be more than [HomeSnapshot.logs], which can be a recent window. */
    suspend fun allLogs(): List<LogEntry> = home.value?.logs.orEmpty()

    /**
     * Waits, at most [timeoutMs], until the home reflects the latest data from other phones.
     * Used before deciding whether a reminder is still needed. Returns at once when nothing is shared.
     */
    suspend fun awaitFresh(timeoutMs: Long) {}
}
