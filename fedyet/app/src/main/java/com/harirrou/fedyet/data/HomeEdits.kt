package com.harirrou.fedyet.data

import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.Duration
import java.time.Instant

/**
 * Every change to a home, as a pure function from one snapshot to the next.
 * Kept free of storage so the rules can be unit tested and reused by any repository.
 */
object HomeEdits {

    /** Adds a log and uses up one portion of any supply linked to that task. */
    fun addLog(home: HomeSnapshot, entry: LogEntry): HomeSnapshot = home.copy(
        logs = home.logs + entry,
        supplies = home.supplies.map {
            if (it.needId == entry.needId) it.copy(remaining = (it.remaining - it.perUse).coerceAtLeast(0.0)) else it
        },
    )

    /** Marks a log undone and puts its portion back. Undoing twice changes nothing. */
    fun undo(home: HomeSnapshot, logId: String): HomeSnapshot {
        val entry = home.logs.firstOrNull { it.id == logId && !it.undone } ?: return home
        return home.copy(
            logs = home.logs.map { if (it.id == logId) it.copy(undone = true) else it },
            supplies = home.supplies.map {
                if (it.needId == entry.needId) it.copy(remaining = it.remaining + it.perUse) else it
            },
        )
    }

    fun savePet(home: HomeSnapshot, pet: Pet, newNeeds: List<Need> = emptyList()): HomeSnapshot {
        val pets = if (home.pets.any { it.id == pet.id }) home.pets.map { if (it.id == pet.id) pet else it } else home.pets + pet
        return home.copy(pets = pets, needs = home.needs + newNeeds.filter { new -> home.needs.none { it.id == new.id } })
    }

    /** Removes a pet with its tasks and their logs; supplies stay but lose their link. */
    fun deletePet(home: HomeSnapshot, petId: String): HomeSnapshot {
        val gone = home.needs.filter { it.petId == petId }.map { it.id }.toSet()
        return home.copy(
            pets = home.pets.filterNot { it.id == petId },
            needs = home.needs.filterNot { it.id in gone },
            logs = home.logs.filterNot { it.needId in gone },
            supplies = home.supplies.map { if (it.needId in gone) it.copy(needId = null) else it },
        )
    }

    fun saveNeed(home: HomeSnapshot, need: Need): HomeSnapshot {
        val needs = if (home.needs.any { it.id == need.id }) home.needs.map { if (it.id == need.id) need else it } else home.needs + need
        return home.copy(needs = needs)
    }

    fun deleteNeed(home: HomeSnapshot, needId: String): HomeSnapshot = home.copy(
        needs = home.needs.filterNot { it.id == needId },
        logs = home.logs.filterNot { it.needId == needId },
        supplies = home.supplies.map { if (it.needId == needId) it.copy(needId = null) else it },
    )

    fun saveSupply(home: HomeSnapshot, supply: Supply): HomeSnapshot {
        val supplies = if (home.supplies.any { it.id == supply.id }) {
            home.supplies.map { if (it.id == supply.id) supply else it }
        } else {
            home.supplies + supply
        }
        return home.copy(supplies = supplies)
    }

    fun deleteSupply(home: HomeSnapshot, supplyId: String): HomeSnapshot =
        home.copy(supplies = home.supplies.filterNot { it.id == supplyId })

    /**
     * Drops logs older than [keepDays], but always keeps the newest live log of each task:
     * interval, monthly and yearly tasks need it however old it is.
     */
    fun prune(home: HomeSnapshot, now: Instant, keepDays: Long = 90): HomeSnapshot {
        val cutoff = now.minus(Duration.ofDays(keepDays))
        val newest = home.logs.filter { !it.undone }.groupBy { it.needId }.mapValues { (_, logs) -> logs.maxBy { it.at }.id }.values.toSet()
        return home.copy(logs = home.logs.filter { !it.at.isBefore(cutoff) || it.id in newest })
    }
}
