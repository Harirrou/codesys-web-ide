package com.harirrou.fedyet.walk

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.harirrou.fedyet.AppContainer
import com.harirrou.fedyet.engine.WalkCheck
import com.harirrou.fedyet.engine.WalkHour
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * @param hours the verdict for each forecast hour; empty until loaded.
 * @param problem what went wrong last, if anything.
 */
data class WalkState(
    val place: WalkPlace? = null,
    val hours: List<WalkHour> = emptyList(),
    val loading: Boolean = false,
    val problem: WalkProblem? = null,
)

enum class WalkProblem { NO_FORECAST, PLACE_NOT_FOUND, LOCATION_UNAVAILABLE }

class WalkViewModel(private val weather: WeatherRepository) : ViewModel() {
    private val mutable = MutableStateFlow(WalkState(place = weather.place.value))
    val state: StateFlow<WalkState> = mutable

    init {
        refresh()
    }

    /** Loads the forecast for the saved place. Cheap to call often: the repository fetches at most hourly. */
    fun refresh() {
        val place = weather.place.value ?: return
        if (mutable.value.loading) return
        mutable.update { it.copy(place = place, loading = true, problem = null) }
        viewModelScope.launch {
            val forecast = weather.forecast(place)
            val hours = forecast.orEmpty().map { WalkCheck.assess(it, place.latitude, place.longitude) }
            mutable.update {
                it.copy(hours = hours, loading = false, problem = if (hours.isEmpty()) WalkProblem.NO_FORECAST else null)
            }
        }
    }

    fun usePhoneLocation(context: Context) = find { Places.fromPhone(context) to WalkProblem.LOCATION_UNAVAILABLE }

    fun useTown(context: Context, name: String) = find { Places.fromName(context, name) to WalkProblem.PLACE_NOT_FOUND }

    private fun find(lookup: suspend () -> Pair<WalkPlace?, WalkProblem>) {
        mutable.update { it.copy(loading = true, problem = null) }
        viewModelScope.launch {
            val (place, problem) = lookup()
            if (place == null) {
                mutable.update { it.copy(loading = false, problem = problem) }
            } else {
                weather.setPlace(place)
                mutable.update { it.copy(place = place, hours = emptyList(), loading = false) }
                refresh()
            }
        }
    }

    companion object {
        fun factory(container: AppContainer): ViewModelProvider.Factory = viewModelFactory {
            initializer { WalkViewModel(container.weather) }
        }
    }
}
