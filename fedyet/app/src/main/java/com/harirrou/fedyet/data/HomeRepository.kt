package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import java.time.Instant
import kotlinx.coroutines.flow.StateFlow

/** The home the user is in. Null while loading or before joining one. */
interface HomeRepository {
    val home: StateFlow<HomeSnapshot?>

    /** Records that the current user did [needId] at [at]. */
    suspend fun addLog(needId: String, at: Instant): LogEntry

    /** Marks a log as undone. Logs are never deleted. */
    suspend fun undo(logId: String)
}
