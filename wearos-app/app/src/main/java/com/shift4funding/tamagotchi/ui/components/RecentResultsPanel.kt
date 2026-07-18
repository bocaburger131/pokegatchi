package com.shift4funding.tamagotchi.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.shift4funding.tamagotchi.pgp.NotificationEvent
import com.shift4funding.tamagotchi.pgp.RecentResultsRepository
import kotlinx.coroutines.delay

/**
 * RecentResultsPanel — small chip at the bottom of the watch screen showing
 * the latest enriched PGP event (e.g. "Caught Pikachu", "Bag full").
 * Auto-dismisses after 3s. Read-only — no action buttons.
 *
 * SAFE-POLISH: New composable. No frozen files modified.
 */
@Composable
fun RecentResultsPanel(modifier: Modifier = Modifier) {
    val repository = remember { RecentResultsRepository.getInstance() }
    val results by repository.results.collectAsState()
    val latest = results.lastOrNull()

    var lastSeenTimestamp by remember { mutableStateOf(0L) }
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(latest) {
        if (latest != null && latest.timestamp != lastSeenTimestamp) {
            lastSeenTimestamp = latest.timestamp
            visible = true
            delay(3_000L)
            visible = false
        }
    }

    AnimatedVisibility(
        visible = visible && latest != null,
        enter = fadeIn(animationSpec = tween(200)),
        exit = fadeOut(animationSpec = tween(400)),
        modifier = modifier
    ) {
        latest?.let { ResultChip(it) }
    }
}

@Composable
private fun ResultChip(event: NotificationEvent) {
    val (bgColor, textColor, icon) = when (event.parsedType) {
        NotificationEvent.ParsedType.CAUGHT -> Triple(
            Color(0xFF1B5E20).copy(alpha = 0.85f), Color(0xFFA5D6A7), "✅"
        )
        NotificationEvent.ParsedType.FLED -> Triple(
            Color(0xFFB71C1C).copy(alpha = 0.85f), Color(0xFFEF9A9A), "❌"
        )
        NotificationEvent.ParsedType.BAG_FULL -> Triple(
            Color(0xFFE65100).copy(alpha = 0.85f), Color(0xFFFFCC80), "🎒"
        )
        NotificationEvent.ParsedType.POKESTOP_ITEMS -> Triple(
            Color(0xFF0D47A1).copy(alpha = 0.85f), Color(0xFF90CAF9), "💠"
        )
        NotificationEvent.ParsedType.CONNECTED -> Triple(
            Color(0xFF2E7D32).copy(alpha = 0.75f), Color(0xFFC8E6C9), "🔗"
        )
        NotificationEvent.ParsedType.DISCONNECTED -> Triple(
            Color(0xFF424242).copy(alpha = 0.85f), Color(0xFFBDBDBD), "⛓️‍💥"
        )
        NotificationEvent.ParsedType.UNKNOWN -> Triple(
            Color(0xFF263238).copy(alpha = 0.85f), Color(0xFFB0BEC5), "❓"
        )
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .background(bgColor, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
            Text(text = icon, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = event.summary(),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = textColor,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            if (event.mergedWithBle) {
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "⚡", fontSize = 10.sp)
            }
        }
    }
}
