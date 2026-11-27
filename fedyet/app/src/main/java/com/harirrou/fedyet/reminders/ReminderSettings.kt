package com.harirrou.fedyet.reminders

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Small facts about reminders that must survive the app being closed. */
class ReminderSettings(context: Context) {
    private val prefs = context.getSharedPreferences("reminders", Context.MODE_PRIVATE)
    private val enabledState = MutableStateFlow(prefs.getBoolean(KEY_ENABLED, true))

    /** Whether the user wants reminders at all. On by default. */
    val enabled: StateFlow<Boolean> = enabledState

    fun setEnabled(value: Boolean) {
        prefs.edit().putBoolean(KEY_ENABLED, value).apply()
        enabledState.value = value
    }

    /** True once the user has answered (or waved away) the "turn on reminders" card. */
    var askedAlready: Boolean
        get() = prefs.getBoolean(KEY_ASKED, false)
        set(value) = prefs.edit().putBoolean(KEY_ASKED, value).apply()

    /** Tasks that currently have a notification on screen. */
    var shownNeeds: Set<String>
        get() = prefs.getStringSet(KEY_SHOWN, emptySet()).orEmpty()
        set(value) = prefs.edit().putStringSet(KEY_SHOWN, value).apply()

    /** Records [key] and returns true the first time it is seen, false ever after. */
    fun firstTime(key: String): Boolean {
        val seen = prefs.getStringSet(KEY_SEEN, emptySet()).orEmpty()
        if (key in seen) return false
        var next = seen + key
        if (next.size > MAX_SEEN) {
            // Keys hold the due time as their second part; keep the most recent ones.
            next = next.sortedByDescending { it.split('|').getOrNull(1)?.toLongOrNull() ?: 0L }.take(MAX_SEEN / 2).toSet()
        }
        prefs.edit().putStringSet(KEY_SEEN, next).apply()
        return true
    }

    private companion object {
        const val KEY_ENABLED = "enabled"
        const val KEY_ASKED = "asked"
        const val KEY_SHOWN = "shown"
        const val KEY_SEEN = "seen"
        const val MAX_SEEN = 300
    }
}
