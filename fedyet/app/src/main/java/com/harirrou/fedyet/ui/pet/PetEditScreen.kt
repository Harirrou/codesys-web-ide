package com.harirrou.fedyet.ui.pet

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.data.Pet
import com.harirrou.fedyet.data.PetPhotos
import com.harirrou.fedyet.data.PetTints
import com.harirrou.fedyet.data.Presets
import com.harirrou.fedyet.data.Species
import com.harirrou.fedyet.engine.Need
import com.harirrou.fedyet.ui.components.ConfirmDialog
import com.harirrou.fedyet.ui.components.GhostButton
import com.harirrou.fedyet.ui.components.GlassField
import com.harirrou.fedyet.ui.components.Hint
import com.harirrou.fedyet.ui.components.PetFace
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.components.ScreenScaffold
import com.harirrou.fedyet.ui.components.SectionTitle
import com.harirrou.fedyet.ui.components.SelectChip
import com.harirrou.fedyet.ui.components.speciesName
import com.harirrou.fedyet.ui.theme.Tokens
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.launch

/** Add a pet, or change one. A new pet comes with suggested tasks for its kind of animal. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PetEditScreen(
    home: HomeSnapshot,
    petId: String?,
    now: () -> Instant,
    onBack: () -> Unit,
    onSave: (Pet, List<Need>) -> Unit,
    onDelete: (String) -> Unit,
) {
    val existing = petId?.let(home::pet)
    val isNew = existing == null
    val id = remember { existing?.id ?: UUID.randomUUID().toString() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var name by rememberSaveable { mutableStateOf(existing?.name.orEmpty()) }
    var detail by rememberSaveable { mutableStateOf(existing?.detail.orEmpty()) }
    var species by rememberSaveable { mutableStateOf(existing?.species ?: Species.DOG) }
    var tint by rememberSaveable { mutableStateOf(existing?.tint ?: PetTints[home.pets.size % PetTints.size]) }
    var photoPath by rememberSaveable { mutableStateOf(existing?.photoPath) }
    var confirmDelete by remember { mutableStateOf(false) }

    // Which suggested tasks are ticked, per kind of animal, so switching back keeps the choice.
    val picked = remember { mutableStateMapOf<String, Boolean>() }
    val presets = Presets.forSpecies(species)
    fun isPicked(key: String, suggested: Boolean) = picked["${species.name}/$key"] ?: suggested

    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            scope.launch { PetPhotos.import(context, uri, id)?.let { photoPath = it } }
        }
    }

    ScreenScaffold(
        title = stringResource(if (isNew) R.string.pet_new_title else R.string.pet_edit_title),
        onBack = onBack,
        bottom = {
            PrimaryButton(
                text = stringResource(R.string.action_save),
                enabled = name.isNotBlank(),
                onClick = {
                    val pet = Pet(id, name.trim(), detail.trim(), tint, species, photoPath)
                    val needs = if (isNew) {
                        presets.filter { isPicked(it.key, it.suggested) }
                            .map { Presets.toNeed(it, id, now(), context::getString) }
                    } else {
                        emptyList()
                    }
                    onSave(pet, needs)
                },
            )
        },
    ) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier.size(132.dp).border(3.dp, Color(tint), CircleShape).padding(7.dp),
                contentAlignment = Alignment.Center,
            ) {
                PetFace(name.ifBlank { "?" }, species, Color(tint), photoPath, 118.dp)
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                GhostButton(
                    text = stringResource(R.string.pet_photo_choose),
                    onClick = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    icon = R.drawable.ic_photo,
                    modifier = Modifier.width(190.dp),
                )
                if (photoPath != null) {
                    GhostButton(
                        text = stringResource(R.string.pet_photo_remove),
                        onClick = { photoPath = null },
                        modifier = Modifier.width(120.dp),
                    )
                }
            }
        }

        GlassField(name, { name = it }, stringResource(R.string.pet_name), capitalization = KeyboardCapitalization.Words)

        SectionTitle(stringResource(R.string.pet_kind))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Species.entries.forEach { option ->
                SpeciesTile(option, selected = option == species, tint = Color(tint), onClick = { species = option })
            }
        }

        GlassField(detail, { detail = it }, stringResource(R.string.pet_detail))

        SectionTitle(stringResource(R.string.pet_colour))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            PetTints.forEachIndexed { index, option ->
                val label = stringResource(R.string.cd_colour, index + 1)
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .semantics { contentDescription = label }
                        .border(2.dp, if (option == tint) Tokens.Text else Color.Transparent, CircleShape)
                        .padding(5.dp)
                        .background(Color(option), CircleShape)
                        .clickable(role = Role.RadioButton) { tint = option },
                )
            }
        }

        if (isNew) {
            SectionTitle(stringResource(R.string.pet_presets_title))
            Hint(stringResource(R.string.pet_presets_hint))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                presets.forEach { preset ->
                    val on = isPicked(preset.key, preset.suggested)
                    SelectChip(
                        text = stringResource(preset.labelRes),
                        selected = on,
                        onClick = { picked["${species.name}/${preset.key}"] = !on },
                    )
                }
            }
        } else {
            Spacer(Modifier.height(4.dp))
            GhostButton(stringResource(R.string.pet_delete), { confirmDelete = true }, color = Tokens.Alert, icon = R.drawable.ic_trash)
        }
        Spacer(Modifier.height(8.dp))
    }

    if (confirmDelete && existing != null) {
        ConfirmDialog(
            title = stringResource(R.string.pet_delete_title, existing.name),
            text = stringResource(R.string.pet_delete_text),
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

@Composable
private fun SpeciesTile(species: Species, selected: Boolean, tint: Color, onClick: () -> Unit) {
    Column(
        modifier = Modifier.width(78.dp).clickable(role = Role.RadioButton, onClick = onClick).padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(66.dp).border(2.5.dp, if (selected) Tokens.Mint else Color.Transparent, CircleShape).padding(5.dp),
            contentAlignment = Alignment.Center,
        ) {
            PetFace(stringResource(speciesName(species)), species, tint, null, 56.dp)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(speciesName(species)),
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) Tokens.Mint else Tokens.TextMuted,
            textAlign = TextAlign.Center,
            maxLines = 1,
        )
    }
}
