package com.harirrou.fedyet.data

import java.time.format.DateTimeFormatter

/** The home's history as a spreadsheet-friendly text file. */
object CsvExport {
    private val date = DateTimeFormatter.ISO_LOCAL_DATE
    private val time = DateTimeFormatter.ofPattern("HH:mm")

    fun history(home: HomeSnapshot): String {
        val rows = home.logs.sortedBy { it.at }.map { log ->
            val need = home.need(log.needId)
            val local = log.at.atZone(home.zone)
            listOf(
                date.format(local),
                time.format(local),
                need?.let { home.pet(it.petId)?.name }.orEmpty(),
                need?.label.orEmpty(),
                home.member(log.by)?.name ?: log.by,
                if (log.undone) "undone" else "",
            )
        }
        return (listOf(listOf("date", "time", "pet", "task", "who", "note")) + rows)
            .joinToString("\r\n") { row -> row.joinToString(",") { cell(it) } } + "\r\n"
    }

    /** Quotes a value when it holds a comma, quote or line break, and blunts spreadsheet formulas. */
    private fun cell(value: String): String {
        val safe = if (value.firstOrNull() in setOf('=', '+', '-', '@')) "'$value" else value
        return if (safe.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) {
            "\"" + safe.replace("\"", "\"\"") + "\""
        } else {
            safe
        }
    }
}
