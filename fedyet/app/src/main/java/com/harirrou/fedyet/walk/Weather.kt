package com.harirrou.fedyet.walk

import android.content.Context
import com.harirrou.fedyet.AppConfig
import com.harirrou.fedyet.engine.HourWeather
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.util.Locale
import kotlin.math.abs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Where walks happen. Kept on the phone; only coordinates rounded to about 1 km are sent for the forecast. */
data class WalkPlace(val latitude: Double, val longitude: Double, val name: String)

/** Reads the forecast format of MET Norway's Locationforecast 2.0 ("compact"). */
object MetNorway {
    fun parse(text: String): List<HourWeather> = runCatching {
        val series = Json.parseToJsonElement(text).jsonObject
            .getValue("properties").jsonObject
            .getValue("timeseries").jsonArray
        series.mapNotNull { element ->
            val entry = element.jsonObject
            val data = entry.getValue("data").jsonObject
            val now = data.getValue("instant").jsonObject.getValue("details").jsonObject
            val air = now.number("air_temperature") ?: return@mapNotNull null
            val nextHour = data["next_1_hours"]?.jsonObject
            val nextSix = data["next_6_hours"]?.jsonObject
            val rain = nextHour?.get("details")?.jsonObject?.number("precipitation_amount")
                ?: nextSix?.get("details")?.jsonObject?.number("precipitation_amount")?.div(6.0)
                ?: 0.0
            val symbol = (nextHour ?: nextSix)?.get("summary")?.jsonObject?.get("symbol_code")?.jsonPrimitive?.content.orEmpty()
            HourWeather(
                time = Instant.parse(entry.getValue("time").jsonPrimitive.content),
                airC = air,
                cloud = (now.number("cloud_area_fraction") ?: 0.0) / 100.0,
                rainMm = rain,
                windMs = now.number("wind_speed") ?: 0.0,
                thunder = "thunder" in symbol,
            )
        }
    }.getOrDefault(emptyList())

    private fun JsonObject.number(key: String): Double? = this[key]?.jsonPrimitive?.doubleOrNull
}

/**
 * Remembers the walk place and fetches the forecast for it, at most once an hour.
 * If the network fails, the last forecast is used for as long as it still covers the present.
 */
class WeatherRepository(context: Context, private val clock: () -> Instant) {
    private val prefs = context.getSharedPreferences("walk", Context.MODE_PRIVATE)
    private val cache = File(context.filesDir, "forecast.json")
    private val placeState = MutableStateFlow(readPlace())

    val place: StateFlow<WalkPlace?> = placeState

    fun setPlace(place: WalkPlace) {
        prefs.edit()
            .putString("lat", place.latitude.toString())
            .putString("lon", place.longitude.toString())
            .putString("name", place.name)
            .apply()
        placeState.value = place
    }

    private fun readPlace(): WalkPlace? {
        val lat = prefs.getString("lat", null)?.toDoubleOrNull() ?: return null
        val lon = prefs.getString("lon", null)?.toDoubleOrNull() ?: return null
        return WalkPlace(lat, lon, prefs.getString("name", "").orEmpty())
    }

    /** The hourly forecast for [place], or null when there is neither network nor a usable saved copy. */
    suspend fun forecast(place: WalkPlace): List<HourWeather>? = withContext(Dispatchers.IO) {
        val lat = round2(place.latitude)
        val lon = round2(place.longitude)
        val now = clock()
        val samePlace = abs((prefs.getString("cacheLat", null)?.toDoubleOrNull() ?: 999.0) - lat) < 0.005 &&
            abs((prefs.getString("cacheLon", null)?.toDoubleOrNull() ?: 999.0) - lon) < 0.005
        val age = now.toEpochMilli() - prefs.getLong("cacheAt", 0L)
        val saved = if (samePlace && cache.exists()) MetNorway.parse(cache.readText()) else emptyList()

        if (saved.isNotEmpty() && age in 0 until FRESH_MILLIS) return@withContext saved

        val fetched = runCatching { fetch(lat, lon) }.getOrNull()
        val parsed = fetched?.let(MetNorway::parse).orEmpty()
        if (fetched != null && parsed.isNotEmpty()) {
            cache.writeText(fetched)
            prefs.edit().putString("cacheLat", lat.toString()).putString("cacheLon", lon.toString()).putLong("cacheAt", now.toEpochMilli()).apply()
            return@withContext parsed
        }
        // Offline: an older forecast is still better than nothing, while it reaches past now.
        saved.takeIf { hours -> hours.any { it.time.isAfter(now) } }
    }

    private fun fetch(lat: Double, lon: Double): String {
        val url = URL(String.format(Locale.US, "%s?lat=%.2f&lon=%.2f", AppConfig.WEATHER_URL, lat, lon))
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000
            // MET Norway requires every app to say who it is.
            connection.setRequestProperty("User-Agent", AppConfig.WEATHER_USER_AGENT)
            connection.setRequestProperty("Accept", "application/json")
            if (connection.responseCode != 200) error("HTTP ${connection.responseCode}")
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun round2(value: Double): Double = Math.round(value * 100.0) / 100.0

    private companion object {
        const val FRESH_MILLIS = 60 * 60 * 1000L
    }
}
