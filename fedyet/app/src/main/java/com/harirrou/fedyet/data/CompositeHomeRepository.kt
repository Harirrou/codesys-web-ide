package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * The app's one doorway to its data when sync is available. A real home lives in the cloud
 * ([remote]); the sample home, and a home started while there was no connection, live on the
 * phone ([local]). A home on the phone that is not the sample is uploaded as soon as it can be.
 */
class CompositeHomeRepository(
    private val local: LocalHomeRepository,
    private val remote: FirestoreHomeRepository,
    scope: CoroutineScope,
) : HomeRepository {

    override val ready: StateFlow<Boolean> = combine(local.ready, remote.ready) { a, b -> a && b }
        .stateIn(scope, SharingStarted.Eagerly, false)

    override val home: StateFlow<HomeSnapshot?> = combine(local.home, remote.home) { l, r -> r ?: l }
        .stateIn(scope, SharingStarted.Eagerly, null)

    override val canSync: Boolean = true

    private fun active(): HomeRepository = if (remote.home.value != null) remote else local

    private val uploading = Mutex()

    init {
        // A real home on the phone (started offline, or from before sync existed) moves to the
        // cloud as soon as this phone is signed in, whenever that happens.
        scope.launch {
            combine(ready, local.home, remote.userId) { isReady, phoneHome, uid -> Triple(isReady, phoneHome, uid) }
                .collect { (isReady, phoneHome, uid) ->
                    if (isReady && uid != null && phoneHome != null && !phoneHome.isSample) uploadLocalHome()
                }
        }
    }

    private suspend fun uploadLocalHome() = uploading.withLock {
        val phoneHome = local.home.value ?: return@withLock
        if (phoneHome.isSample || remote.home.value != null) return@withLock
        if (remote.importHome(phoneHome)) local.deleteEverything()
    }

    override suspend fun createHome(homeName: String, myName: String) {
        if (local.home.value?.isSample == true) local.deleteEverything()
        val online = runCatching { remote.createHome(homeName, myName) }.isSuccess
        // No connection on a first start: keep it on the phone for now; it is uploaded later.
        if (!online) local.createHome(homeName, myName)
    }

    override suspend fun createSampleHome() = local.createSampleHome()
    override suspend fun renameHome(name: String) = active().renameHome(name)
    override suspend fun renameMe(name: String) = active().renameMe(name)
    override suspend fun addLog(needId: String, at: Instant): LogEntry? = active().addLog(needId, at)
    override suspend fun undo(logId: String) = active().undo(logId)
    override suspend fun savePet(pet: Pet, newNeeds: List<Need>) = active().savePet(pet, newNeeds)
    override suspend fun deletePet(petId: String) = active().deletePet(petId)
    override suspend fun saveNeed(need: Need) = active().saveNeed(need)
    override suspend fun deleteNeed(needId: String) = active().deleteNeed(needId)
    override suspend fun saveSupply(supply: Supply) = active().saveSupply(supply)
    override suspend fun deleteSupply(supplyId: String) = active().deleteSupply(supplyId)
    override suspend fun deleteEverything() = active().deleteEverything()
    override suspend fun createInvite(): String? = if (remote.home.value != null) remote.createInvite() else null
    override suspend fun allLogs(): List<LogEntry> = active().allLogs()
    override suspend fun awaitFresh(timeoutMs: Long) = remote.awaitFresh(timeoutMs)

    override suspend fun joinHome(code: String, myName: String): JoinResult {
        val result = remote.joinHome(code, myName)
        if (result == JoinResult.JOINED && local.home.value?.isSample == true) local.deleteEverything()
        return result
    }
}
