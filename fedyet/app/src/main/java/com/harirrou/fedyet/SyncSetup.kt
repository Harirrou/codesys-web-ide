package com.harirrou.fedyet

import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings

/** Starts Firebase if this build has it: the real project, the local emulators, or neither. */
object SyncSetup {

    fun firebase(context: Context): Pair<FirebaseAuth, FirebaseFirestore>? = runCatching {
        val emulator = BuildConfig.FIREBASE_EMULATOR_HOST
        val app = when {
            emulator.isNotEmpty() -> FirebaseApp.getApps(context).firstOrNull() ?: FirebaseApp.initializeApp(
                context,
                // A "demo-" project only ever talks to the emulators.
                FirebaseOptions.Builder()
                    .setProjectId("demo-fedyet")
                    .setApplicationId("1:000000000000:android:0000000000000000")
                    .setApiKey("demo-key")
                    .build(),
            )
            BuildConfig.HAS_FIREBASE_CONFIG -> FirebaseApp.getApps(context).firstOrNull() ?: FirebaseApp.initializeApp(context)
            else -> null
        } ?: return null

        val auth = FirebaseAuth.getInstance(app)
        val db = FirebaseFirestore.getInstance(app)
        if (emulator.isNotEmpty()) {
            auth.useEmulator(emulator, 9099)
            db.useEmulator(emulator, 8080)
        }
        db.firestoreSettings = FirebaseFirestoreSettings.Builder()
            .setLocalCacheSettings(PersistentCacheSettings.newBuilder().build())
            .build()
        auth to db
    }.onFailure { Log.w("FedYetSync", "Firebase not started", it) }.getOrNull()
}
