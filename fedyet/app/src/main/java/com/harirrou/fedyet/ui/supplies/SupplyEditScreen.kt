package com.harirrou.fedyet.ui.supplies

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Supply
import com.harirrou.fedyet.ui.amount
import com.harirrou.fedyet.ui.components.ConfirmDialog
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassField
import com.harirrou.fedyet.ui.components.Hint
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.components.ScreenScaffold
import com.harirrou.fedyet.ui.components.SectionTitle
import com.harirrou.fedyet.ui.components.SelectChip
import com.harirrou.fedyet.ui.theme.Tokens
import java.util.UUID

private fun number(text: String): Double? = text.trim().replace(',', '.').toDoubleOrNull()?.takeIf { it >= 0 }

/** Add something that runs out, or change it: how much is left, how much each time, and which task uses it. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SupplyEditScreen(
    home: HomeSnapshot,
    supplyId: String?,
    onBack: () -> Unit,
    onSave: (Supply) -> Unit,
    onDelete: (String) -> Unit,
) {
    val existing = supplyId?.let(home::supply)
    var label by rememberSaveable { mutableStateOf(existing?.label.orEmpty()) }
    var unit by rememberSaveable { mutableStateOf(existing?.unit.orEmpty()) }
    var remaining by rememberSaveable { mutableStateOf(existing?.let { amount(it.remaining) }.orEmpty()) }
    var perUse by rememberSaveable { mutableStateOf(existing?.let { amount(it.perUse) } ?: "1") }
    var needId by rememberSaveable { mutableStateOf(existing?.needId) }
    var confirmDelete by remember { mutableStateOf(false) }

    val left = number(remaining)
    val each = number(perUse)

    ScreenScaffold(
        title = stringResource(if (existing == null) R.string.supply_new_title else R.string.supply_edit_title),
        onBack = onBack,
        bottom = {
            PrimaryButton(
                text = stringResource(R.string.action_save),
                enabled = label.isNotBlank() && left != null && each != null && each > 0,
                onClick = {
                    onSave(
                        Supply(
                            id = existing?.id ?: UUID.randomUUID().toString(),
                            label = label.trim(),
                            unit = unit.trim(),
                            remaining = left ?: 0.0,
                            perUse = each ?: 1.0,
                            needId = needId,
                        ),
                    )
                },
            )
        },
    ) {
        GlassField(label, { label = it }, stringResource(R.string.supply_label))
        GlassField(unit, { unit = it }, stringResource(R.string.supply_unit), capitalization = KeyboardCapitalization.None)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GlassField(remaining, { remaining = it }, stringResource(R.string.supply_remaining), Modifier.weight(1f), KeyboardType.Decimal)
            GlassField(perUse, { perUse = it }, stringResource(R.string.supply_per_use), Modifier.weight(1f), KeyboardType.Decimal)
        }

        SectionTitle(stringResource(R.string.supply_linked))
        Hint(stringResource(R.string.supply_linked_hint))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SelectChip(stringResource(R.string.supply_linked_none), needId == null, { needId = null })
            home.needs.forEach { need ->
                val pet = home.pet(need.petId)
                if (pet != null) {
                    SelectChip("${pet.name} · ${need.label}", needId == need.id, { needId = need.id })
                }
            }
        }

        if (existing != null) {
            Spacer(Modifier.height(4.dp))
            GhostButton(stringResource(R.string.supply_delete), { confirmDelete = true }, color = Tokens.Alert, icon = R.drawable.ic_trash)
        }
        Spacer(Modifier.height(8.dp))
    }

    if (confirmDelete && existing != null) {
        ConfirmDialog(
            title = stringResource(R.string.supply_delete_title, existing.label),
            text = stringResource(R.string.supply_delete_text),
            confirm = stringResource(R.string.action_delete),
            dismiss = stringResource(R.string.action_cancel),
            danger = true,
            onConfirm = {
                confirmDelete = false
                onDelete(existing.id)
            },
            onDismiss = { confirmDelete = false },
        )
    }
}
