package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * Keeps the home in one JSON file on the phone. Works with no account and no network.
 * Every change is applied in memory first, so the screen updates at once, then written out.
 */
class LocalHomeRepository(
    private val file: File,
    private val clock: () -> Instant,
    scope: CoroutineScope,
    private val io: CoroutineDispatcher = Dispatchers.IO,
    private val zone: () -> ZoneId = { ZoneId.systemDefault() },
) : HomeRepository {

    private val readyState = MutableStateFlow(false)
    private val homeState = MutableStateFlow<HomeSnapshot?>(null)
    private val lock = Mutex()

    override val ready: StateFlow<Boolean> = readyState
    override val home: StateFlow<HomeSnapshot?> = homeState

    init {
        scope.launch { load() }
    }

    /** Reads the file. Exposed so tests can wait for it. */
    suspend fun load() = lock.withLock {
        val loaded = withContext(io) {
            if (file.exists()) HomeJson.decode(file.readText())?.let { HomeEdits.prune(it, clock()) } else null
        }
        homeState.value = loaded
        readyState.value = true
    }

    override suspend fun createHome(homeName: String, myName: String) {
        val me = UUID.randomUUID().toString()
        replace(
            HomeSnapshot(
                id = UUID.randomUUID().toString(),
                name = homeName,
                zone = zone(),
                meId = me,
                members = listOf(Member(me, myName, MemberTints[0])),
                pets = emptyList(),
                needs = emptyList(),
                logs = emptyList(),
            ),
        )
    }

    override suspend fun createSampleHome() = replace(SampleHome.build(clock(), zone()))

    override suspend fun renameHome(name: String) = change { it.copy(name = name) }

    override suspend fun renameMe(name: String) = change { home ->
        home.copy(members = home.members.map { if (it.id == home.meId) it.copy(name = name) else it })
    }

    override suspend fun addLog(needId: String, at: Instant): LogEntry? {
        val current = homeState.value ?: return null
        if (current.need(needId) == null) return null
        val entry = LogEntry(id = UUID.randomUUID().toString(), needId = needId, by = current.meId, at = at)
        change { HomeEdits.addLog(it, entry) }
        return entry
    }

    override suspend fun undo(logId: String) = change { HomeEdits.undo(it, logId) }

    override suspend fun savePet(pet: Pet, newNeeds: List<Need>) = change { HomeEdits.savePet(it, pet, newNeeds) }

    override suspend fun deletePet(petId: String) = change { HomeEdits.deletePet(it, petId) }

    override suspend fun saveNeed(need: Need) = change { HomeEdits.saveNeed(it, need) }

    override suspend fun deleteNeed(needId: String) = change { HomeEdits.deleteNeed(it, needId) }

    override suspend fun saveSupply(supply: Supply) = change { HomeEdits.saveSupply(it, supply) }

    override suspend fun deleteSupply(supplyId: String) = change { HomeEdits.deleteSupply(it, supplyId) }

    override suspend fun deleteEverything() = lock.withLock {
        homeState.value = null
        withContext(io) { file.delete() }
        Unit
    }

    private suspend fun change(edit: (HomeSnapshot) -> HomeSnapshot) = lock.withLock {
        val current = homeState.value ?: return@withLock
        val next = edit(current)
        homeState.value = next
        write(next)
    }

    private suspend fun replace(next: HomeSnapshot) = lock.withLock {
        homeState.value = next
        write(next)
    }

    /** Writes to a temporary file first, so a crash mid-write cannot leave half a home behind. */
    private suspend fun write(home: HomeSnapshot) = withContext(io) {
        file.parentFile?.mkdirs()
        val temp = File(file.parentFile, file.name + ".tmp")
        temp.writeText(HomeJson.encode(home))
        if (!temp.renameTo(file)) {
            file.writeText(temp.readText())
            temp.delete()
        }
    }
}
