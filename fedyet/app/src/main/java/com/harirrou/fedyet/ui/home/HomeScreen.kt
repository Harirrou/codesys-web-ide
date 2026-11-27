package com.harirrou.fedyet.ui.home

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.harirrou.fedyet.BuildConfig
import com.harirrou.fedyet.R
import com.harirrou.fedyet.data.CsvExport
import com.harirrou.fedyet.data.HomeSnapshot
import com.harirrou.fedyet.ui.components.ConfirmDialog
import com.harirrou.fedyet.ui.components.GlassCard
import com.harirrou.fedyet.ui.components.Hint
import com.harirrou.fedyet.ui.components.MemberDot
import com.harirrou.fedyet.ui.components.PrimaryButton
import com.harirrou.fedyet.ui.components.SectionTitle
import com.harirrou.fedyet.ui.components.TextEditDialog
import com.harirrou.fedyet.ui.theme.Tokens
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** The home itself: its name, who is in it, your data, and the small print. */
@Composable
fun HomeScreen(
    home: HomeSnapshot,
    padding: PaddingValues,
    onRenameHome: (String) -> Unit,
    onRenameMe: (String) -> Unit,
    onDeleteEverything: () -> Unit,
    onLicences: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var renamingHome by remember { mutableStateOf(false) }
    var renamingMe by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var exported by remember { mutableStateOf(false) }
    val me = home.member(home.meId)

    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) {
            scope.launch {
                val ok = withContext(Dispatchers.IO) {
                    runCatching {
                        context.contentResolver.openOutputStream(uri)?.use { it.write(CsvExport.history(home).toByteArray()) } != null
                    }.getOrDefault(false)
                }
                exported = ok
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(
                start = 16.dp,
                end = 16.dp,
                top = padding.calculateTopPadding() + 20.dp,
                bottom = padding.calculateBottomPadding() + 20.dp,
            ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            home.name,
            style = MaterialTheme.typography.headlineLarge,
            color = Tokens.Text,
            modifier = Modifier.padding(horizontal = 6.dp),
        )

        if (home.isSample) {
            GlassCard(glow = Tokens.Mint) {
                Text(stringResource(R.string.home_sample_title), style = MaterialTheme.typography.titleLarge, color = Tokens.Text)
                Spacer(Modifier.height(6.dp))
                Text(stringResource(R.string.home_sample_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
                Spacer(Modifier.height(14.dp))
                PrimaryButton(stringResource(R.string.home_start_own), { confirmDelete = true })
            }
        }

        SectionTitle(stringResource(R.string.home_people))
        GlassCard {
            home.members.forEachIndexed { index, member ->
                if (index > 0) HorizontalDivider(color = Tokens.Hairline)
                Row(Modifier.fillMaxWidth().heightIn(min = 52.dp), verticalAlignment = Alignment.CenterVertically) {
                    MemberDot(member, size = 34.dp)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        if (member.id == home.meId) stringResource(R.string.home_you, member.name) else member.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = Tokens.Text,
                    )
                }
            }
        }
        // Build step 2 (sync) turns this note into the real "Invite someone" action.
        Hint(stringResource(R.string.home_sharing_body))

        SectionTitle(stringResource(R.string.home_settings))
        GlassCard {
            if (!home.isSample) {
                SettingRow(stringResource(R.string.home_name), home.name, onClick = { renamingHome = true })
                HorizontalDivider(color = Tokens.Hairline)
                SettingRow(stringResource(R.string.home_your_name), me?.name.orEmpty(), onClick = { renamingMe = true })
                HorizontalDivider(color = Tokens.Hairline)
            }
            SettingRow(
                title = stringResource(R.string.home_export),
                value = if (exported) stringResource(R.string.home_export_done) else stringResource(R.string.home_export_hint),
                onClick = { export.launch("fed-yet-history.csv") },
            )
            HorizontalDivider(color = Tokens.Hairline)
            SettingRow(stringResource(R.string.home_licences), null, onClick = onLicences)
            if (!home.isSample) {
                HorizontalDivider(color = Tokens.Hairline)
                SettingRow(stringResource(R.string.home_delete), null, onClick = { confirmDelete = true }, color = Tokens.Alert)
            }
        }

        Hint(stringResource(R.string.home_version, BuildConfig.VERSION_NAME))
    }

    if (renamingHome) {
        TextEditDialog(
            title = stringResource(R.string.home_name),
            label = stringResource(R.string.home_name),
            initial = home.name,
            onSave = {
                renamingHome = false
                onRenameHome(it)
            },
            onDismiss = { renamingHome = false },
        )
    }
    if (renamingMe) {
        TextEditDialog(
            title = stringResource(R.string.home_your_name),
            label = stringResource(R.string.home_your_name),
            initial = me?.name.orEmpty(),
            onSave = {
                renamingMe = false
                onRenameMe(it)
            },
            onDismiss = { renamingMe = false },
        )
    }
    if (confirmDelete) {
        ConfirmDialog(
            title = stringResource(if (home.isSample) R.string.home_leave_sample_title else R.string.home_delete_title),
            text = stringResource(if (home.isSample) R.string.home_leave_sample_text else R.string.home_delete_text),
            confirm = stringResource(if (home.isSample) R.string.home_start_own else R.string.action_delete),
            dismiss = stringResource(R.string.action_cancel),
            danger = !home.isSample,
            onConfirm = {
                confirmDelete = false
                onDeleteEverything()
            },
            onDismiss = { confirmDelete = false },
        )
    }
}

@Composable
private fun SettingRow(title: String, value: String?, onClick: () -> Unit, color: Color = Tokens.Text) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(role = Role.Button, onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = color)
            if (!value.isNullOrBlank()) {
                Text(value, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
            }
        }
        Icon(painterResource(R.drawable.ic_chevron), contentDescription = null, tint = Tokens.TextMuted, modifier = Modifier.size(20.dp))
    }
}

/** Credits for the fonts and pictures the app ships with. */
@Composable
fun LicencesScreen(onBack: () -> Unit) {
    com.harirrou.fedyet.ui.components.ScreenScaffold(title = stringResource(R.string.home_licences), onBack = onBack) {
        GlassCard {
            Text(stringResource(R.string.licences_fonts_title), style = MaterialTheme.typography.titleMedium, color = Tokens.Text)
            Spacer(Modifier.height(6.dp))
            Text(stringResource(R.string.licences_fonts_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
        }
        GlassCard {
            Text(stringResource(R.string.licences_pictures_title), style = MaterialTheme.typography.titleMedium, color = Tokens.Text)
            Spacer(Modifier.height(6.dp))
            Text(stringResource(R.string.licences_pictures_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
        }
    }
}
