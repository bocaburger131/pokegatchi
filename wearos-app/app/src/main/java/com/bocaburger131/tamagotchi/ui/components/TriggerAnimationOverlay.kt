package com.bocaburger131.tamagotchi.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextAlign
import androidx.wear.compose.material3.Text
import com.bocaburger131.tamagotchi.pgp.AnimationResolver
import com.bocaburger131.tamagotchi.pgp.PgpConfig
import kotlinx.coroutines.delay

/**
 * TriggerAnimationOverlay — renders a BLE trigger animation based on the resolved
 * AnimationResolver result.
 *
 * This is the SINGLE composable that all BLE-triggered animations flow through.
 * Keeps temp GIFs entirely separate from normal asset paths.
 *
 * SAFE-POLISH: New file. No BLE core files modified.
 */
@Composable
fun TriggerAnimationOverlay(
    eventType: String?,
    modifier: Modifier = Modifier
) {
    if (eventType == null) return

    val context = LocalContext.current
    val allowTempGifs = PgpConfig.ALLOW_TEMP_REFERENCE_GIFS

    // Resolve once when eventType changes
    val resolved = remember(eventType, allowTempGifs) {
        AnimationResolver.resolve(context, eventType, allowTempGifs)
    }

    // Auto-dismiss state
    var visible by remember(eventType) { mutableStateOf(true) }

    // Auto-dismiss after animation duration
    LaunchedEffect(eventType) {
        delay(2_500L) // 2.5s overlay duration
        visible = false
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(animationSpec = tween(200)),
        exit = fadeOut(animationSpec = tween(400)),
        modifier = modifier
    ) {
        when (resolved) {
            is AnimationResolver.ResolvedAnimation.TempGif -> {
                TempGifOverlay(
                    assetPath = resolved.assetPath,
                    eventType = resolved.eventType
                )
            }

            is AnimationResolver.ResolvedAnimation.ApprovedAsset -> {
                ApprovedAssetOverlay(
                    assetPath = resolved.assetPath,
                    eventType = resolved.eventType
                )
            }

            is AnimationResolver.ResolvedAnimation.FallbackPulse -> {
                FallbackPulseOverlay(
                    eventType = resolved.eventType,
                    color = Color(resolved.color)
                )
            }

            AnimationResolver.ResolvedAnimation.None -> {
                // No animation — nothing to render
            }
        }
    }
}

// ─── Temp GIF Overlay ────────────────────────────────────────────────

/**
 * Renders a temp placeholder GIF from assets/temp_gifs/.
 * DEV ONLY — never visible in prod builds (ALLOW_TEMP_REFERENCE_GIFS = false).
 *
 * NOTE: Compose on Wear OS doesn't have native GIF support via Image/AsyncImage.
 * For actual GIF playback you'd use a WebView or a frame-animation approach.
 * This placeholder shows an indicator that a temp GIF WOULD play here.
 */
@Composable
private fun TempGifOverlay(assetPath: String, eventType: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center
    ) {
        // In production, replace with actual GIF renderer (e.g., Coil GIF,
        // or frame-based AnimatedImage). For now, show contextual indicator.
        Canvas(modifier = Modifier.size(80.dp)) {
            val cx = size.width / 2
            val cy = size.height / 2
            val r = size.width * 0.40f

            // Pulsing ring
            drawCircle(
                color = Color(0xFFFFC107).copy(alpha = 0.35f),
                radius = r,
                center = Offset(cx, cy)
            )
            drawCircle(
                color = Color(0xFFFFC107).copy(alpha = 0.7f),
                radius = r,
                center = Offset(cx, cy),
                style = Stroke(width = 2.5f)
            )

            // "DEV" badge
        }
        // Text label for dev debugging
        Text(
            text = "🐾 DEV\n$eventType",
            fontSize = 11.sp,
            color = Color(0xFFFFC107),
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 20.dp)
        )
    }
}

// ─── Approved Asset Overlay ──────────────────────────────────────────

/**
 * Renders an approved original animation asset from assets/triggers/.
 * These are committed and release-safe.
 *
 * NOTE: Extend with actual asset renderer (Lottie, WebP animated, etc.).
 */
@Composable
private fun ApprovedAssetOverlay(assetPath: String, eventType: String) {
    val infiniteTransition = rememberInfiniteTransition(label = "approved_$eventType")
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.1f)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(80.dp)) {
            val cx = size.width / 2
            val cy = size.height / 2
            val r = size.width * 0.35f * pulse

            drawCircle(
                color = Color(0xFF4CAF50).copy(alpha = 0.3f),
                radius = r,
                center = Offset(cx, cy)
            )
            drawCircle(
                color = Color(0xFF4CAF50).copy(alpha = 0.8f),
                radius = r * 0.7f,
                center = Offset(cx, cy),
                style = Stroke(width = 3f)
            )
        }
    }
}

// ─── Fallback Pulse Overlay ──────────────────────────────────────────

/**
 * Always-available fallback — a simple Compose Canvas pulse/glow animation.
 * No asset files needed. Works on every build variant.
 */
@Composable
private fun FallbackPulseOverlay(eventType: String, color: Color) {
    val infiniteTransition = rememberInfiniteTransition(label = "fallback_$eventType")

    val pulseRadius by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "radius"
    )

    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val ringScale by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "ring"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.08f)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(100.dp)) {
            val cx = size.width / 2
            val cy = size.height / 2
            val baseR = size.width * 0.2f

            // Outer ring
            drawCircle(
                color = color.copy(alpha = pulseAlpha * 0.5f),
                radius = baseR * ringScale,
                center = Offset(cx, cy),
                style = Stroke(width = 3f)
            )

            // Inner glow
            drawCircle(
                color = color.copy(alpha = pulseAlpha),
                radius = baseR * pulseRadius,
                center = Offset(cx, cy)
            )

            // Bright core
            drawCircle(
                color = color.copy(alpha = 0.9f),
                radius = baseR * 0.25f,
                center = Offset(cx, cy)
            )
        }

        // Event icon label
        val icon = iconForEvent(eventType)
        Text(
            text = icon,
            fontSize = 20.sp,
            modifier = Modifier.align(Alignment.Center)
        )
    }
}

/** Map event type to a simple emoji icon for the fallback overlay. */
private fun iconForEvent(eventType: String): String = when (eventType) {
    "caught"          -> "✅"
    "fled"            -> "❌"
    "spun"            -> "💠"
    "pokemon_nearby"  -> "👀"
    "new_species"     -> "🆕"
    "pokestop_nearby" -> "📍"
    "bag_full"        -> "🎒"
    "out_of_balls"    -> "⚠️"
    else              -> "⚡"
}
