package com.harirrou.fedyet.ui.home

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.harirrou.fedyet.R
import com.harirrou.fedyet.ui.theme.Bricolage
import com.harirrou.fedyet.ui.theme.Tokens

/** Shows an invite code big enough to read out, with a button to send it. */
@Composable
fun InviteDialog(code: String, homeName: String, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val spaced = if (code.length == 8) code.take(4) + " " + code.drop(4) else code
    val message = stringResource(R.string.invite_share_text, homeName, spaced)
    val chooserTitle = stringResource(R.string.invite_share)

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Tokens.NightRaised,
        titleContentColor = Tokens.Text,
        shape = RoundedCornerShape(28.dp),
        title = { Text(stringResource(R.string.invite_title), style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (code.isEmpty()) {
                    Text(stringResource(R.string.invite_failed), style = MaterialTheme.typography.bodyMedium, color = Tokens.Due)
                } else {
                    Text(stringResource(R.string.invite_body), style = MaterialTheme.typography.bodyMedium, color = Tokens.TextMuted)
                    Text(
                        spaced,
                        color = Tokens.Mint,
                        fontFamily = Bricolage,
                        fontWeight = FontWeight.Bold,
                        fontSize = 34.sp,
                        letterSpacing = 3.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(stringResource(R.string.invite_expiry), style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
                }
            }
        },
        confirmButton = {
            if (code.isNotEmpty()) {
                TextButton(
                    onClick = {
                        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, message)
                        context.startActivity(Intent.createChooser(send, chooserTitle))
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = Tokens.Mint),
                ) { Text(stringResource(R.string.invite_share)) }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, colors = ButtonDefaults.textButtonColors(contentColor = Tokens.Text)) {
                Text(stringResource(R.string.action_done))
            }
        },
    )
}
