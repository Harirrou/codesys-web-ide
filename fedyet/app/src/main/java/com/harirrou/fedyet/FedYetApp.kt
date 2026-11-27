package com.harirrou.fedyet

import android.app.Application
import com.harirrou.fedyet.data.HomeRepository
import com.harirrou.fedyet.data.SampleHomeRepository
import java.time.Instant

class FedYetApp : Application() {
    /** Hand-rolled dependency container. Small on purpose; swap pieces here, not in screens. */
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer()
    }
}

class AppContainer {
    val clock: () -> Instant = { Instant.now() }

    // Build step 2 replaces this with the Firestore-backed repository.
    val homeRepository: HomeRepository = SampleHomeRepository(clock)
}
