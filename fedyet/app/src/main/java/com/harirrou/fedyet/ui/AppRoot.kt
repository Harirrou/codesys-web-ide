package com.harirrou.fedyet.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.harirrou.fedyet.AppContainer
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.walk.WalkCard
import com.harirrou.fedyet.walk.WalkViewModel
import com.harirrou.fedyet.ui.board.BoardScreen
import com.harirrou.fedyet.ui.board.BoardViewModel
import com.harirrou.fedyet.ui.components.AmbientBackground
import com.harirrou.fedyet.ui.home.HomeScreen
import com.harirrou.fedyet.ui.home.LicencesScreen
import com.harirrou.fedyet.ui.onboarding.WelcomeScreen
import com.harirrou.fedyet.ui.pet.NeedEditScreen
import com.harirrou.fedyet.ui.pet.PetEditScreen
import com.harirrou.fedyet.ui.pet.PetScreen
import com.harirrou.fedyet.ui.supplies.SuppliesScreen
import com.harirrou.fedyet.ui.supplies.SupplyEditScreen
import com.harirrou.fedyet.ui.theme.Ambient
import com.harirrou.fedyet.ui.theme.Tokens
import com.harirrou.fedyet.ui.theme.ambientFor
import com.harirrou.fedyet.ui.upcoming.UpcomingScreen
import java.time.Instant
import java.time.ZoneId

/** A screen pushed on top of the four tabs. Stored as text so it survives the app being put away. */
sealed interface Route {
    data object Tabs : Route
    data class PetDetail(val petId: String) : Route
    data class PetEdit(val petId: String?) : Route
    data class NeedEdit(val petId: String, val needId: String?) : Route
    data class SupplyEdit(val supplyId: String?) : Route
    data object Licences : Route

    fun encode(): String = when (this) {
        Tabs -> "tabs"
        is PetDetail -> "pet|$petId"
        is PetEdit -> "petEdit|${petId.orEmpty()}"
        is NeedEdit -> "needEdit|$petId|${needId.orEmpty()}"
        is SupplyEdit -> "supplyEdit|${supplyId.orEmpty()}"
        Licences -> "licences"
    }

    companion object {
        fun decode(text: String): Route {
            val parts = text.split('|')
            return when (parts[0]) {
                "pet" -> PetDetail(parts[1])
                "petEdit" -> PetEdit(parts.getOrNull(1)?.ifEmpty { null })
                "needEdit" -> NeedEdit(parts[1], parts.getOrNull(2)?.ifEmpty { null })
                "supplyEdit" -> SupplyEdit(parts.getOrNull(1)?.ifEmpty { null })
                "licences" -> Licences
                else -> Tabs
            }
        }
    }
}

/** The whole app: the welcome screen until there is a home, then the tabs and whatever is pushed on them. */
@Composable
fun AppRoot(container: AppContainer) {
    val app: AppViewModel = viewModel(factory = AppViewModel.factory(container))
    val board: BoardViewModel = viewModel(factory = BoardViewModel.factory(container))
    val ready by app.ready.collectAsStateWithLifecycle()
    val home by app.home.collectAsStateWithLifecycle()
    val now by app.now.collectAsStateWithLifecycle()
    val zone = home?.zone ?: ZoneId.systemDefault()
    val ambient = ambientFor(now.atZone(zone).hour)

    AmbientBackground(ambient) {
        val current = home
        when {
            !ready -> Box(Modifier.fillMaxSize())
            current == null -> WelcomeScreen(onStart = app::createHome, onSample = app::createSampleHome)
            // A different home starts from a clean slate: first tab, nothing pushed.
            else -> key(current.id) { Main(container, app, board, current, now, ambient) }
        }
    }
}

@Composable
private fun Main(
    container: AppContainer,
    app: AppViewModel,
    board: BoardViewModel,
    home: HomeSnapshot,
    now: Instant,
    ambient: Ambient,
) {
    val stack = rememberSaveable(
        saver = listSaver<SnapshotStateList<String>, String>(save = { it.toList() }, restore = { it.toMutableStateList() }),
    ) { mutableStateListOf() }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }

    fun push(route: Route) {
        stack.add(route.encode())
    }
    fun pop() {
        if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex)
    }

    BackHandler(enabled = stack.isNotEmpty() || tab != 0) {
        if (stack.isNotEmpty()) pop() else tab = 0
    }

    AnimatedContent(
        targetState = stack.lastOrNull() ?: Route.Tabs.encode(),
        transitionSpec = {
            (fadeIn(tween(200)) + slideInVertically(tween(240)) { it / 24 }) togetherWith fadeOut(tween(120))
        },
        label = "screen",
    ) { encoded ->
        when (val route = Route.decode(encoded)) {
            Route.Tabs -> Tabs(
                container = container,
                app = app,
                board = board,
                home = home,
                now = now,
                ambient = ambient,
                tab = tab,
                onTab = { tab = it },
                snackbar = snackbar,
                push = ::push,
            )
            is Route.PetDetail -> PetScreen(
                home = home,
                petId = route.petId,
                now = now,
                onBack = ::pop,
                onEdit = { push(Route.PetEdit(route.petId)) },
                onAddNeed = { push(Route.NeedEdit(route.petId, null)) },
                onEditNeed = { push(Route.NeedEdit(route.petId, it)) },
                onUndo = app::undo,
                onEditSupply = { push(Route.SupplyEdit(it)) },
            )
            is Route.PetEdit -> PetEditScreen(
                home = home,
                petId = route.petId,
                now = app::timeNow,
                onBack = ::pop,
                onSave = { pet, needs ->
                    app.savePet(pet, needs)
                    pop()
                },
                onDelete = {
                    app.deletePet(it)
                    stack.clear()
                },
            )
            is Route.NeedEdit -> NeedEditScreen(
                home = home,
                petId = route.petId,
                needId = route.needId,
                now = now,
                onBack = ::pop,
                onSave = {
                    app.saveNeed(it)
                    pop()
                },
                onDelete = {
                    app.deleteNeed(it)
                    pop()
                },
            )
            is Route.SupplyEdit -> SupplyEditScreen(
                home = home,
                supplyId = route.supplyId,
                onBack = ::pop,
                onSave = {
                    app.saveSupply(it)
                    pop()
                },
                onDelete = {
                    app.deleteSupply(it)
                    pop()
                },
            )
            Route.Licences -> LicencesScreen(onBack = ::pop)
        }
    }
}

@Composable
private fun Tabs(
    container: AppContainer,
    app: AppViewModel,
    board: BoardViewModel,
    home: HomeSnapshot,
    now: Instant,
    ambient: Ambient,
    tab: Int,
    onTab: (Int) -> Unit,
    snackbar: SnackbarHostState,
    push: (Route) -> Unit,
) {
    val reminderUi = rememberReminderUi(container, home)
    val walkModel: WalkViewModel = viewModel(factory = WalkViewModel.factory(container))
    val walkState by walkModel.state.collectAsStateWithLifecycle()
    // The walk check is for homes with an animal that gets walked.
    val walks = home.pets.any { it.species == Species.DOG } || home.needs.any { it.kind == NeedKind.WALK }
    LaunchedEffect(walks, tab) { if (walks && tab == 0) walkModel.refresh() }
    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = {
            SnackbarHost(snackbar) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = Tokens.NightRaised,
                    contentColor = Tokens.Text,
                    actionColor = Tokens.Due,
                    shape = RoundedCornerShape(18.dp),
                )
            }
        },
        bottomBar = { TabBar(tab, onTab) },
    ) { padding ->
        when (tab) {
            0 -> BoardScreen(
                viewModel = board,
                padding = padding,
                snackbar = snackbar,
                ambient = ambient,
                onPet = { push(Route.PetDetail(it)) },
                onAddPet = { push(Route.PetEdit(null)) },
                onAddTask = { push(Route.NeedEdit(it, null)) },
                onStartOwnHome = { onTab(3) },
                banner = if (reminderUi.shouldAsk) {
                    { ReminderCard(reminderUi) }
                } else {
                    null
                },
                walk = if (walks) {
                    { formatter -> WalkCard(walkState, now, formatter, walkModel) }
                } else {
                    null
                },
            )
            1 -> UpcomingScreen(home, now, padding, onPet = { push(Route.PetDetail(it)) })
            2 -> SuppliesScreen(
                home = home,
                now = now,
                padding = padding,
                onEdit = { push(Route.SupplyEdit(it)) },
                onAdd = { push(Route.SupplyEdit(null)) },
            )
            else -> HomeScreen(
                home = home,
                padding = padding,
                onRenameHome = app::renameHome,
                onRenameMe = app::renameMe,
                onDeleteEverything = app::deleteEverything,
                onLicences = { push(Route.Licences) },
                reminders = reminderUi,
            )
        }
    }
}

private data class TabSpec(val icon: Int, val label: Int)

private val TabSpecs = listOf(
    TabSpec(R.drawable.ic_tab_board, R.string.tab_board),
    TabSpec(R.drawable.ic_tab_upcoming, R.string.tab_upcoming),
    TabSpec(R.drawable.ic_tab_supplies, R.string.tab_supplies),
    TabSpec(R.drawable.ic_tab_home, R.string.tab_home),
)

/** A floating bar. Nearly solid, because without real blur the list behind would show through as clutter. */
@Composable
private fun TabBar(selected: Int, onSelect: (Int) -> Unit) {
    val shape = RoundedCornerShape(30.dp)
    // The list scrolls underneath; fade it out so nothing shows through below the bar.
    Box(
        Modifier.fillMaxWidth().background(
            Brush.verticalGradient(0f to Color.Transparent, 0.22f to Tokens.Night.copy(alpha = 0.97f), 1f to Tokens.Night),
        ),
    ) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .clip(shape)
            .background(Tokens.NightRaised)
            .border(1.dp, Tokens.GlassEdgeBottom, shape)
            .padding(6.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        TabSpecs.forEachIndexed { index, spec ->
            val active = index == selected
            val itemShape = RoundedCornerShape(24.dp)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 54.dp)
                    .clip(itemShape)
                    .background(if (active) Color(0x1AFFFFFF) else Color.Transparent)
                    .selectable(selected = active, role = Role.Tab, onClick = { onSelect(index) })
                    .padding(vertical = 7.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    painterResource(spec.icon),
                    contentDescription = null,
                    tint = if (active) Tokens.Mint else Tokens.TextMuted,
                    modifier = Modifier.size(22.dp),
                )
                Text(
                    stringResource(spec.label),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (active) Tokens.Mint else Tokens.TextMuted,
                )
            }
        }
    }    }
}
