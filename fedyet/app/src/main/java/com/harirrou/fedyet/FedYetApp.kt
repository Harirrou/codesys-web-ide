package com.harirrou.fedyet

import android.app.Application
import com.harirrou.fedyet.data.CompositeHomeRepository
import com.harirrou.fedyet.data.FirestoreHomeRepository
import com.harirrou.fedyet.data.HomeRepository
import com.harirrou.fedyet.data.LocalHomeRepository
import com.harirrou.fedyet.reminders.ReminderScheduler
import com.harirrou.fedyet.reminders.ReminderSettings
import com.harirrou.fedyet.walk.WeatherRepository
import com.harirrou.fedyet.widget.BoardWidget
import java.io.File
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class FedYetApp : Application() {
    /** Hand-rolled dependency container. Small on purpose; swap pieces here, not in screens. */
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}

class AppContainer(private val app: Application) {
    val clock: () -> Instant = { Instant.now() }

    /** Lives as long as the app's process. Used for work that must outlast a screen. */
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val localHome = LocalHomeRepository(File(app.filesDir, "home.json"), clock, scope)

    /** Shared between phones when Firebase is set up for this build; otherwise kept on the phone. */
    val homeRepository: HomeRepository = SyncSetup.firebase(app)?.let { (auth, db) ->
        CompositeHomeRepository(localHome, FirestoreHomeRepository(app, auth, db, clock, scope), scope)
    } ?: localHome

    val weather = WeatherRepository(app, clock)

    val reminderSettings = ReminderSettings(app)
    val reminders = ReminderScheduler(app, clock, reminderSettings)

    init {
        // Whatever changes the home (a tick, an edit, later a sync from another phone),
        // reminders and the widget follow from this one place.
        scope.launch {
            homeRepository.ready.first { it }
            homeRepository.home.collect { home ->
                reminders.sync(home)
                BoardWidget.refresh(app)
            }
        }
    }
}
