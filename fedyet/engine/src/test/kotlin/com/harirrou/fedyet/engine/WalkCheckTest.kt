package com.harirrou.fedyet.engine

import java.time.Instant
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WalkCheckTest {
    // Madrid, a summer afternoon: the sun is high around 14:00 local (12:00 UTC).
    private val lat = 40.42
    private val lon = -3.70
    private fun hour(utc: String, air: Double, cloud: Double = 0.0, rain: Double = 0.0, wind: Double = 2.0, thunder: Boolean = false) =
        HourWeather(Instant.parse(utc), air, cloud, rain, wind, thunder)

    @Test
    fun `the sun is where it should be`() {
        // Cap Spartel, 27 Nov 2026: noon height about 33 degrees, on the horizon at sunset (17:10 UTC).
        assertTrue(abs(WalkCheck.sunElevation(Instant.parse("2026-11-27T12:11:00Z"), 35.79, -5.92) - 33.1) < 1.0)
        assertTrue(abs(WalkCheck.sunElevation(Instant.parse("2026-11-27T17:10:00Z"), 35.79, -5.92)) < 1.5)
        // Midsummer noon in Madrid: about 73 degrees. Midnight: well below the horizon.
        assertTrue(abs(WalkCheck.sunElevation(Instant.parse("2026-06-21T12:16:00Z"), lat, lon) - 73.0) < 1.0)
        assertTrue(WalkCheck.sunElevation(Instant.parse("2026-06-21T00:00:00Z"), lat, lon) < -20)
    }

    @Test
    fun `pavement in full sun is far hotter than the air, and the same as the air at night`() {
        // The common rule of thumb: 25 C air, high clear sun, asphalt around 52 C.
        assertTrue(abs(WalkCheck.pavementC(25.0, 65.0, 0.0) - 52.0) < 1.5)
        assertEquals(25.0, WalkCheck.pavementC(25.0, -5.0, 0.0))
        // Overcast takes most of the heating away.
        assertTrue(WalkCheck.pavementC(25.0, 65.0, 1.0) < 33.0)
    }

    @Test
    fun `a mild clear morning is good`() {
        val result = WalkCheck.assess(hour("2026-06-21T06:00:00Z", air = 18.0), lat, lon)
        assertEquals(WalkLevel.GOOD, result.level)
        assertTrue(result.reasons.isEmpty())
    }

    @Test
    fun `a hot clear afternoon is hot pavement first, heat second`() {
        val result = WalkCheck.assess(hour("2026-06-21T12:00:00Z", air = 33.0), lat, lon)
        assertEquals(WalkLevel.AVOID, result.level)
        assertEquals(listOf(WalkReason.HOT_PAVEMENT, WalkReason.HEAT), result.reasons)
        assertTrue(result.pavementC > 55)
    }

    @Test
    fun `warm air under high sun is avoid for paws even when the air alone is fine`() {
        val result = WalkCheck.assess(hour("2026-06-21T12:00:00Z", air = 26.0), lat, lon)
        assertEquals(WalkLevel.AVOID, result.level)
        assertEquals(listOf(WalkReason.HOT_PAVEMENT), result.reasons)
    }

    @Test
    fun `the same warm day is only care once the sun is low`() {
        val result = WalkCheck.assess(hour("2026-06-21T18:30:00Z", air = 28.0), lat, lon)
        assertEquals(WalkLevel.CARE, result.level)
        assertEquals(listOf(WalkReason.HEAT), result.reasons)
    }

    @Test
    fun `cold, rain, wind and thunder each lower the verdict`() {
        assertEquals(WalkLevel.CARE, WalkCheck.assess(hour("2026-01-10T12:00:00Z", air = -2.0), lat, lon).level)
        assertEquals(listOf(WalkReason.FREEZING), WalkCheck.assess(hour("2026-01-10T12:00:00Z", air = -12.0), lat, lon).reasons)
        assertEquals(listOf(WalkReason.RAIN), WalkCheck.assess(hour("2026-01-10T12:00:00Z", air = 10.0, cloud = 1.0, rain = 1.0), lat, lon).reasons)
        assertEquals(WalkLevel.AVOID, WalkCheck.assess(hour("2026-01-10T12:00:00Z", air = 10.0, cloud = 1.0, rain = 6.0), lat, lon).level)
        assertEquals(listOf(WalkReason.WIND), WalkCheck.assess(hour("2026-01-10T12:00:00Z", air = 10.0, wind = 12.0), lat, lon).reasons)
        assertEquals(WalkLevel.AVOID, WalkCheck.assess(hour("2026-01-10T12:00:00Z", air = 10.0, thunder = true), lat, lon).level)
    }

    @Test
    fun `darkness is a note, not a reason to stay in`() {
        val result = WalkCheck.assess(hour("2026-06-21T23:00:00Z", air = 20.0), lat, lon)
        assertEquals(WalkLevel.GOOD, result.level)
        assertEquals(listOf(WalkReason.DARK), result.reasons)
    }

    @Test
    fun `on a hot day the next good window is in the evening`() {
        // Hourly from 10:00 to 23:00 UTC: hot through the afternoon, cooling after sunset.
        val temps = listOf(30.0, 32.0, 34.0, 35.0, 35.0, 34.0, 33.0, 31.0, 29.0, 27.5, 26.0, 25.0, 24.0, 23.0)
        val hours = temps.mapIndexed { i, t ->
            WalkCheck.assess(hour(Instant.parse("2026-06-21T10:00:00Z").plusSeconds(i * 3600L).toString(), air = t), lat, lon)
        }
        val now = Instant.parse("2026-06-21T12:20:00Z")
        assertEquals(WalkLevel.AVOID, WalkCheck.current(hours, now)!!.level)
        val window = WalkCheck.nextGoodWindow(hours, now)!!
        assertEquals(Instant.parse("2026-06-21T20:00:00Z"), window.start)
        assertEquals(Instant.parse("2026-06-22T00:00:00Z"), window.end)
    }

    @Test
    fun `when it is good now there is no need to name a later window`() {
        val hours = listOf(WalkCheck.assess(hour("2026-06-21T06:00:00Z", air = 18.0), lat, lon))
        assertNull(WalkCheck.nextGoodWindow(hours, Instant.parse("2026-06-21T06:10:00Z")))
    }
}
