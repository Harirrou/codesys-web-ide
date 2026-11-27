package com.harirrou.fedyet

import com.harirrou.fedyet.walk.MetNorway
import com.harirrou.fedyet.walk.temperature
import java.time.Instant
import java.util.Locale
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class WeatherTest {
    /** The shape of a MET Norway Locationforecast 2.0 "compact" answer: hourly, then six-hourly. */
    private val sample = """
        {"type":"Feature","geometry":{"type":"Point","coordinates":[-3.7,40.42,667]},
         "properties":{"meta":{"updated_at":"2026-06-21T11:30:00Z","units":{"air_temperature":"celsius"}},
          "timeseries":[
           {"time":"2026-06-21T12:00:00Z","data":{"instant":{"details":{"air_pressure_at_sea_level":1014.2,
              "air_temperature":33.4,"cloud_area_fraction":12.5,"relative_humidity":21.0,"wind_from_direction":250.1,"wind_speed":3.2}},
              "next_12_hours":{"summary":{"symbol_code":"clearsky_day"}},
              "next_1_hours":{"summary":{"symbol_code":"clearsky_day"},"details":{"precipitation_amount":0.0}},
              "next_6_hours":{"summary":{"symbol_code":"clearsky_day"},"details":{"precipitation_amount":0.0}}}},
           {"time":"2026-06-21T13:00:00Z","data":{"instant":{"details":{"air_temperature":31.0,"cloud_area_fraction":90.0,"wind_speed":6.0}},
              "next_1_hours":{"summary":{"symbol_code":"heavyrainshowersandthunder_day"},"details":{"precipitation_amount":5.2}}}},
           {"time":"2026-06-23T18:00:00Z","data":{"instant":{"details":{"air_temperature":24.0,"cloud_area_fraction":50.0,"wind_speed":2.0}},
              "next_6_hours":{"summary":{"symbol_code":"rain"},"details":{"precipitation_amount":6.0}}}},
           {"time":"2026-06-30T12:00:00Z","data":{"instant":{"details":{"cloud_area_fraction":50.0}}}}
          ]}}
    """.trimIndent()

    @Test
    fun `a forecast is read hour by hour`() {
        val hours = MetNorway.parse(sample)
        assertEquals(3, hours.size) // the last entry has no temperature and is left out
        val first = hours[0]
        assertEquals(Instant.parse("2026-06-21T12:00:00Z"), first.time)
        assertEquals(33.4, first.airC)
        assertEquals(0.125, first.cloud)
        assertEquals(3.2, first.windMs)
        assertEquals(0.0, first.rainMm)
        assertFalse(first.thunder)
    }

    @Test
    fun `thunder and rain are picked up, and six-hour rain is spread over its hours`() {
        val hours = MetNorway.parse(sample)
        assertTrue(hours[1].thunder)
        assertEquals(5.2, hours[1].rainMm)
        assertEquals(1.0, hours[2].rainMm)
    }

    @Test
    fun `a real answer from MET Norway is read in full`() {
        // Saved from api.met.no for New York on 27 Nov 2026 (data: MET Norway, CC BY 4.0).
        val text = checkNotNull(javaClass.getResourceAsStream("/met-norway-sample.json")).bufferedReader().readText()
        val hours = MetNorway.parse(text)
        assertEquals(33, hours.size)
        assertTrue(hours.zipWithNext().all { (a, b) -> a.time.isBefore(b.time) })
        assertTrue(hours.all { it.airC in -40.0..50.0 && it.cloud in 0.0..1.0 && it.windMs in 0.0..60.0 && it.rainMm >= 0.0 })
        // The first thirty are an hour apart.
        assertEquals(3600, hours[1].time.epochSecond - hours[0].time.epochSecond)
    }

    @Test
    fun `anything that is not a forecast reads as empty`() {
        assertTrue(MetNorway.parse("").isEmpty())
        assertTrue(MetNorway.parse("<html>403</html>").isEmpty())
        assertTrue(MetNorway.parse("{\"properties\":{}}").isEmpty())
    }

    @Test
    fun `temperatures are shown in the unit people use`() {
        assertEquals("52°C", temperature(52.0, Locale.FRANCE))
        assertEquals("126°F", temperature(52.0, Locale.US))
        assertEquals("32°F", temperature(0.0, Locale.US))
    }
}
