package com.harirrou.fedyet.engine

import java.time.Instant
import java.time.ZoneOffset
import kotlin.math.PI
import kotlin.math.acos
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin

/** One hour of forecast. [cloud] is 0 (clear) to 1 (overcast). */
data class HourWeather(
    val time: Instant,
    val airC: Double,
    val cloud: Double,
    val rainMm: Double,
    val windMs: Double,
    val thunder: Boolean = false,
)

enum class WalkLevel { GOOD, CARE, AVOID }

enum class WalkReason { HOT_PAVEMENT, HEAT, FREEZING, COLD, THUNDER, HEAVY_RAIN, RAIN, WIND, DARK }

/**
 * The verdict for one hour.
 *
 * @param reasons the worst first. DARK is only a note; it never lowers the level.
 * @param pavementC a rough estimate of sunlit asphalt, not a measurement.
 */
data class WalkHour(
    val time: Instant,
    val level: WalkLevel,
    val reasons: List<WalkReason>,
    val airC: Double,
    val pavementC: Double,
)

data class WalkWindow(val start: Instant, val end: Instant)

/**
 * "Is it OK to walk the dog now?" from an hourly forecast and where the sun is.
 *
 * The limits are everyday rules of thumb, not veterinary advice: sunlit asphalt can run
 * 20-30 C hotter than the air, and from about 52 C it can burn paws within a minute.
 * The app always presents the result as an estimate.
 */
object WalkCheck {
    const val PAVEMENT_AVOID_C = 52.0
    const val PAVEMENT_CARE_C = 45.0
    const val HEAT_AVOID_C = 32.0
    const val HEAT_CARE_C = 27.0
    const val COLD_CARE_C = 0.0
    const val FREEZING_AVOID_C = -10.0
    const val RAIN_CARE_MM = 0.3
    const val RAIN_AVOID_MM = 4.0
    const val WIND_CARE_MS = 11.0
    const val WIND_AVOID_MS = 17.0

    /** Height of the sun above the horizon in degrees (negative at night). Good to about half a degree. */
    fun sunElevation(time: Instant, latitude: Double, longitude: Double): Double {
        val utc = time.atZone(ZoneOffset.UTC)
        val minutes = utc.hour * 60 + utc.minute + utc.second / 60.0
        val gamma = 2 * PI / 365.0 * (utc.dayOfYear - 1 + (minutes / 60.0 - 12) / 24.0)
        val equationOfTime = 229.18 * (
            0.000075 + 0.001868 * cos(gamma) - 0.032077 * sin(gamma) -
                0.014615 * cos(2 * gamma) - 0.040849 * sin(2 * gamma)
            )
        val declination = 0.006918 - 0.399912 * cos(gamma) + 0.070257 * sin(gamma) -
            0.006758 * cos(2 * gamma) + 0.000907 * sin(2 * gamma) -
            0.002697 * cos(3 * gamma) + 0.00148 * sin(3 * gamma)
        val solarMinutes = minutes + equationOfTime + 4 * longitude
        val hourAngle = Math.toRadians(solarMinutes / 4.0 - 180.0)
        val lat = Math.toRadians(latitude)
        val cosZenith = sin(lat) * sin(declination) + cos(lat) * cos(declination) * cos(hourAngle)
        return 90.0 - Math.toDegrees(acos(cosZenith.coerceIn(-1.0, 1.0)))
    }

    /**
     * Rough temperature of sunlit asphalt: the air temperature plus up to 30 C of solar heating,
     * scaled by how high the sun is and how much cloud there is. In shade or at night it is the air temperature.
     */
    fun pavementC(airC: Double, sunElevation: Double, cloud: Double): Double {
        if (sunElevation <= 0) return airC
        val sun = sin(Math.toRadians(sunElevation))
        val throughCloud = 1 - 0.75 * cloud.coerceIn(0.0, 1.0).pow(3.4)
        return airC + 30.0 * sun * throughCloud
    }

    fun assess(hour: HourWeather, latitude: Double, longitude: Double): WalkHour {
        val elevation = sunElevation(hour.time, latitude, longitude)
        val pavement = pavementC(hour.airC, elevation, hour.cloud)

        val avoid = buildList {
            if (pavement >= PAVEMENT_AVOID_C) add(WalkReason.HOT_PAVEMENT)
            if (hour.airC >= HEAT_AVOID_C) add(WalkReason.HEAT)
            if (hour.airC <= FREEZING_AVOID_C) add(WalkReason.FREEZING)
            if (hour.thunder) add(WalkReason.THUNDER)
            if (hour.rainMm >= RAIN_AVOID_MM) add(WalkReason.HEAVY_RAIN)
            if (hour.windMs >= WIND_AVOID_MS) add(WalkReason.WIND)
        }
        val care = buildList {
            if (pavement >= PAVEMENT_CARE_C && WalkReason.HOT_PAVEMENT !in avoid) add(WalkReason.HOT_PAVEMENT)
            if (hour.airC >= HEAT_CARE_C && WalkReason.HEAT !in avoid) add(WalkReason.HEAT)
            if (hour.airC <= COLD_CARE_C && WalkReason.FREEZING !in avoid) add(WalkReason.COLD)
            if (hour.rainMm >= RAIN_CARE_MM && WalkReason.HEAVY_RAIN !in avoid) add(WalkReason.RAIN)
            if (hour.windMs >= WIND_CARE_MS && WalkReason.WIND !in avoid) add(WalkReason.WIND)
        }
        val level = when {
            avoid.isNotEmpty() -> WalkLevel.AVOID
            care.isNotEmpty() -> WalkLevel.CARE
            else -> WalkLevel.GOOD
        }
        // Civil twilight: darker than this and a light or reflective collar is worth it.
        val notes = if (elevation < -6) listOf(WalkReason.DARK) else emptyList()
        return WalkHour(hour.time, level, avoid + care + notes, hour.airC, pavement)
    }

    /** The hour in [hours] that covers [now], or the nearest one. */
    fun current(hours: List<WalkHour>, now: Instant): WalkHour? =
        hours.lastOrNull { !it.time.isAfter(now) } ?: hours.firstOrNull()

    /**
     * The next stretch of good hours, starting from [now] and looking at most [withinHours] ahead.
     * Null when the present hour is already good, or when nothing good is coming.
     */
    fun nextGoodWindow(hours: List<WalkHour>, now: Instant, withinHours: Long = 18): WalkWindow? {
        val present = current(hours, now) ?: return null
        if (present.level == WalkLevel.GOOD) return null
        val limit = now.plusSeconds(withinHours * 3600)
        val ahead = hours.filter { it.time.isAfter(present.time) && !it.time.isAfter(limit) }
        val first = ahead.indexOfFirst { it.level == WalkLevel.GOOD }
        if (first < 0) return null
        var last = first
        while (last + 1 < ahead.size && ahead[last + 1].level == WalkLevel.GOOD) last++
        return WalkWindow(ahead[first].time, ahead[last].time.plusSeconds(3600))
    }
}
