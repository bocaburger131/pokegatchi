package com.shift4funding.tamagotchi.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.shift4funding.tamagotchi.pgp.PgpConfig
import kotlinx.coroutines.delay

/**
 * PGP Mode Toggle — watch-sized mode switch.
 *
 * Compact icon button in the top-right corner. Toggles between:
 *   PGP_ONLY  — standalone watch mode (no sync)
 *   PGP_PLUS_POKEGATCHI — connected mode (sync enabled)
 *
 * SAFE-POLISH: New file. No BLE core files modified.
 */
@Composable
fun PgpModeToggle(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var pgpMode by remember { mutableStateOf(PgpConfig.getPgpMode(context)) }
    var showLabel by remember { mutableStateOf(false) }

    // Auto-dismiss label after 2s
    LaunchedEffect(pgpMode) {
        showLabel = true
        delay(2_000L)
        showLabel = false
    }

    val isPokegatchi = pgpMode == PgpConfig.PgpMode.PGP_PLUS_POKEGATCHI

    Box(modifier = modifier) {
        // Mode indicator icon
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(
                    if (isPokegatchi) Color(0xFF4CAF50).copy(alpha = 0.25f)
                    else Color(0xFFFFC107).copy(alpha = 0.25f)
                )
                .clickable {
                    val next = if (isPokegatchi) PgpConfig.PgpMode.PGP_ONLY
                    else PgpConfig.PgpMode.PGP_PLUS_POKEGATCHI
                    PgpConfig.setPgpMode(context, next)
                    pgpMode = next
                },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (isPokegatchi) "🔗" else "⌚",
                fontSize = 14.sp
            )
        }

        // Mode label — fades in on change, auto-dismisses
        AnimatedVisibility(
            visible = showLabel,
            enter = fadeIn(tween(200)),
            exit = fadeOut(tween(600)),
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = (-36).dp, y = 0.dp)
        ) {
            Text(
                text = if (isPokegatchi) "sync" else "pgp",
                fontSize = 9.sp,
                color = if (isPokegatchi) Color(0xFF4CAF50) else Color(0xFFFFC107),
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.End,
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.7f), CircleShape)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
    }
}