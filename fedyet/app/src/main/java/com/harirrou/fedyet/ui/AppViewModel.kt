package com.harirrou.fedyet.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.harirrou.fedyet.AppContainer
import com.harirrou.fedyet.data.HomeRepository
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.JoinResult
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.Supply
import com.harirrou.fedyet.engine.Need
import java.time.Instant
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** The home, the time, and every edit a screen can ask for. Screens stay free of storage code. */
class AppViewModel(
    private val repository: HomeRepository,
    private val clock: () -> Instant,
) : ViewModel() {

    val ready: StateFlow<Boolean> = repository.ready
    val home: StateFlow<HomeSnapshot?> = repository.home

    /** The current time, refreshed often enough for "due" to turn "overdue" on screen. */
    val now: StateFlow<Instant> = flow {
        while (true) {
            emit(clock())
            delay(15_000)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), clock())

    fun createHome(homeName: String, myName: String) = run { repository.createHome(homeName, myName) }
    fun createSampleHome() = run { repository.createSampleHome() }
    fun renameHome(name: String) = run { repository.renameHome(name) }
    fun renameMe(name: String) = run { repository.renameMe(name) }
    fun undo(logId: String) = run { repository.undo(logId) }
    fun savePet(pet: Pet, newNeeds: List<Need>) = run { repository.savePet(pet, newNeeds) }
    fun deletePet(petId: String) = run { repository.deletePet(petId) }
    fun saveNeed(need: Need) = run { repository.saveNeed(need) }
    fun deleteNeed(needId: String) = run { repository.deleteNeed(needId) }
    fun saveSupply(supply: Supply) = run { repository.saveSupply(supply) }
    fun deleteSupply(supplyId: String) = run { repository.deleteSupply(supplyId) }
    fun deleteEverything() = run { repository.deleteEverything() }

    val canSync: Boolean get() = repository.canSync

    fun createInvite(onCode: (String?) -> Unit) {
        viewModelScope.launch { onCode(repository.createInvite()) }
    }

    fun joinHome(code: String, myName: String, onResult: (JoinResult) -> Unit) {
        viewModelScope.launch { onResult(repository.joinHome(code, myName)) }
    }

    suspend fun allLogs() = repository.allLogs()

    fun timeNow(): Instant = clock()

    private fun run(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    companion object {
        fun factory(container: AppContainer): ViewModelProvider.Factory = viewModelFactory {
            initializer { AppViewModel(container.homeRepository, container.clock) }
        }
    }
}
