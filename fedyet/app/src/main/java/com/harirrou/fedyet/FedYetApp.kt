package com.harirrou.fedyet

import android.app.Application
import com.harirrou.fedyet.data.HomeRepository
import com.harirrou.fedyet.data.LocalHomeRepository
import java.io.File
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class FedYetApp : Application() {
    /** Hand-rolled dependency container. Small on purpose; swap pieces here, not in screens. */
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}

class AppContainer(app: Application) {
    val clock: () -> Instant = { Instant.now() }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    // Build step 2 replaces this with the Firestore-backed repository.
    val homeRepository: HomeRepository = LocalHomeRepository(File(app.filesDir, "home.json"), clock, scope)
}
