package com.harirrou.fedyet.ui.board

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.harirrou.fedyet.AppContainer
import com.harirrou.fedyet.data.HomeRepository
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.engine.GuardReason
import com.harirrou.fedyet.engine.GuardVerdict
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.NeedsEngine
import java.time.Instant
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** "This looks already done" – shown before a guarded task is logged a second time. */
data class GuardPrompt(
    val needId: String,
    val title: String,
    val petName: String,
    val hard: Boolean,
    val reason: GuardReason,
    val previousAt: Instant,
    val previousById: String,
)

data class BoardState(
    val home: HomeSnapshot? = null,
    val board: BoardUi? = null,
    val now: Instant = Instant.EPOCH,
    val prompt: GuardPrompt? = null,
)

sealed interface BoardEvent {
    data class Logged(val logId: String, val title: String, val petName: String) : BoardEvent
}

class BoardViewModel(
    private val repository: HomeRepository,
    private val clock: () -> Instant,
) : ViewModel() {

    private val prompt = MutableStateFlow<GuardPrompt?>(null)
    private val eventFlow = MutableSharedFlow<BoardEvent>(extraBufferCapacity = 8)
    val events: SharedFlow<BoardEvent> = eventFlow.asSharedFlow()

    // Statuses change with time alone (due -> overdue), so the board is refreshed regularly.
    private val ticker = flow {
        while (true) {
            emit(Unit)
            delay(REFRESH_MS)
        }
    }

    val state: StateFlow<BoardState> = combine(repository.home, ticker, prompt) { home, _, currentPrompt ->
        val now = clock()
        BoardState(home, home?.let { BoardPresenter.present(it, now) }, now, currentPrompt)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BoardState())

    fun onRowTapped(needId: String) {
        val home = repository.home.value ?: return
        val need = home.needs.firstOrNull { it.id == needId } ?: return
        val now = clock()
        val title = titleOf(home, needId, now)
        val petName = home.pets.firstOrNull { it.id == need.petId }?.name.orEmpty()

        when (val verdict = NeedsEngine(home.zone).checkLog(need, home.logs, now)) {
            GuardVerdict.Allowed -> log(needId, title, petName)
            is GuardVerdict.Warn ->
                prompt.value = promptFor(needId, title, petName, false, verdict.reason, verdict.previous)
            is GuardVerdict.ConfirmRequired ->
                prompt.value = promptFor(needId, title, petName, true, verdict.reason, verdict.previous)
        }
    }

    fun confirmPrompt() {
        val current = prompt.value ?: return
        prompt.value = null
        log(current.needId, current.title, current.petName)
    }

    fun dismissPrompt() {
        prompt.value = null
    }

    fun undo(logId: String) {
        viewModelScope.launch { repository.undo(logId) }
    }

    private fun log(needId: String, title: String, petName: String) {
        viewModelScope.launch {
            val entry = repository.addLog(needId, clock()) ?: return@launch
            eventFlow.emit(BoardEvent.Logged(entry.id, title, petName))
        }
    }

    private fun titleOf(home: HomeSnapshot, needId: String, now: Instant): String =
        BoardPresenter.present(home, now).pets.flatMap { it.rows }.firstOrNull { it.needId == needId }?.title.orEmpty()

    private fun promptFor(
        needId: String,
        title: String,
        petName: String,
        hard: Boolean,
        reason: GuardReason,
        previous: LogEntry,
    ) = GuardPrompt(needId, title, petName, hard, reason, previous.at, previous.by)

    companion object {
        private const val REFRESH_MS = 15_000L

        fun factory(container: AppContainer): ViewModelProvider.Factory = viewModelFactory {
            initializer { BoardViewModel(container.homeRepository, container.clock) }
        }
    }
}
