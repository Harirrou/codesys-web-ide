package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.Instant
import kotlinx.coroutines.flow.StateFlow

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

    /** Removes the home and all its data from this phone. */
    suspend fun deleteEverything()
}
