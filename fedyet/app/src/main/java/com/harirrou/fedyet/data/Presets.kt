package com.harirrou.fedyet.data

import com.harirrou.fedyet.R
import com.harirrou.fedyet.engine.DailySlot
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.engine.NeedKind
import com.harirrou.fedyet.engine.Schedule
import java.time.Instant
import java.time.LocalTime
import java.util.UUID

/**
 * Suggested tasks for each kind of animal, offered when a pet is added.
 * They are ordinary starting points the owner can change, not care advice.
 */
data class NeedPreset(
    val key: String,
    val labelRes: Int,
    val kind: NeedKind,
    val repeat: PresetRepeat,
    /** Whether it is ticked by default in the "add a pet" screen. */
    val suggested: Boolean = true,
)

sealed interface PresetRepeat {
    /** Times of day, each with an optional name ("Breakfast"). */
    data class Daily(val slots: List<Pair<String, Int?>>) : PresetRepeat
    data class EveryDays(val days: Int, val at: String) : PresetRepeat
}

object Presets {
    private fun daily(vararg slots: Pair<String, Int?>) = PresetRepeat.Daily(slots.toList())
    private fun every(days: Int, at: String = "09:00") = PresetRepeat.EveryDays(days, at)

    private val meals = daily("07:00" to R.string.slot_breakfast, "18:00" to R.string.slot_dinner)
    private val water = NeedPreset("water", R.string.preset_water, NeedKind.WATER, daily("08:00" to null))

    fun forSpecies(species: Species): List<NeedPreset> = when (species) {
        Species.DOG -> listOf(
            NeedPreset("meals", R.string.preset_meals, NeedKind.MEAL, meals),
            NeedPreset("walks", R.string.preset_walks, NeedKind.WALK, daily("08:00" to R.string.slot_morning_walk, "18:30" to R.string.slot_evening_walk)),
            water,
            NeedPreset("flea", R.string.preset_flea, NeedKind.MEDICINE, every(30), suggested = false),
        )
        Species.CAT -> listOf(
            NeedPreset("meals", R.string.preset_meals, NeedKind.MEAL, meals),
            NeedPreset("litter", R.string.preset_litter, NeedKind.CLEAN, daily("19:00" to null)),
            water,
            NeedPreset("flea", R.string.preset_flea, NeedKind.MEDICINE, every(30), suggested = false),
        )
        Species.RABBIT, Species.GUINEA_PIG -> listOf(
            NeedPreset("meals", R.string.preset_pellets, NeedKind.MEAL, meals),
            NeedPreset("hay", R.string.preset_hay, NeedKind.OTHER, daily("08:00" to null)),
            water,
            NeedPreset("clean", R.string.preset_clean_cage, NeedKind.CLEAN, every(3)),
        )
        Species.HAMSTER -> listOf(
            NeedPreset("food", R.string.preset_food, NeedKind.MEAL, daily("19:00" to null)),
            water,
            NeedPreset("clean", R.string.preset_clean_cage, NeedKind.CLEAN, every(7)),
        )
        Species.BIRD -> listOf(
            NeedPreset("food", R.string.preset_food, NeedKind.MEAL, daily("08:00" to null)),
            water,
            NeedPreset("clean", R.string.preset_clean_cage, NeedKind.CLEAN, every(7)),
        )
        Species.FISH -> listOf(
            NeedPreset("food", R.string.preset_feed, NeedKind.MEAL, daily("09:00" to null)),
            NeedPreset("waterChange", R.string.preset_water_change, NeedKind.WATER, every(7)),
            NeedPreset("filter", R.string.preset_filter, NeedKind.CLEAN, every(30), suggested = false),
        )
        Species.REPTILE -> listOf(
            NeedPreset("food", R.string.preset_feed, NeedKind.MEAL, every(3)),
            NeedPreset("mist", R.string.preset_mist, NeedKind.WATER, daily("09:00" to null)),
            NeedPreset("clean", R.string.preset_clean_tank, NeedKind.CLEAN, every(14)),
            NeedPreset("uvb", R.string.preset_uvb, NeedKind.OTHER, every(180), suggested = false),
        )
        Species.HORSE -> listOf(
            NeedPreset("meals", R.string.preset_feed, NeedKind.MEAL, daily("07:00" to R.string.slot_morning, "17:00" to R.string.slot_evening)),
            NeedPreset("exercise", R.string.preset_exercise, NeedKind.WALK, daily("09:00" to null)),
            NeedPreset("muck", R.string.preset_muck_out, NeedKind.CLEAN, daily("08:00" to null)),
            NeedPreset("farrier", R.string.preset_farrier, NeedKind.OTHER, every(42), suggested = false),
        )
        Species.CHICKEN -> listOf(
            NeedPreset("food", R.string.preset_feed, NeedKind.MEAL, daily("07:30" to null)),
            water,
            NeedPreset("eggs", R.string.preset_eggs, NeedKind.OTHER, daily("09:00" to null)),
            NeedPreset("lockUp", R.string.preset_lock_up, NeedKind.OTHER, daily("19:00" to null)),
            NeedPreset("clean", R.string.preset_clean_coop, NeedKind.CLEAN, every(7)),
        )
        Species.OTHER -> listOf(
            NeedPreset("food", R.string.preset_food, NeedKind.MEAL, daily("08:00" to null)),
            water,
            NeedPreset("clean", R.string.preset_clean_cage, NeedKind.CLEAN, every(7), suggested = false),
        )
    }

    /** Turns a preset into a real task for [petId]. [text] looks up a string resource. */
    fun toNeed(preset: NeedPreset, petId: String, now: Instant, text: (Int) -> String): Need {
        val schedule = when (val repeat = preset.repeat) {
            is PresetRepeat.Daily -> Schedule.Daily(
                repeat.slots.map { (time, label) -> DailySlot(LocalTime.parse(time), label?.let(text)) },
            )
            is PresetRepeat.EveryDays -> Schedule.EveryDays(repeat.days, LocalTime.parse(repeat.at))
        }
        return Need(
            id = UUID.randomUUID().toString(),
            petId = petId,
            kind = preset.kind,
            label = text(preset.labelRes),
            schedule = schedule,
            createdAt = now,
        )
    }
}
