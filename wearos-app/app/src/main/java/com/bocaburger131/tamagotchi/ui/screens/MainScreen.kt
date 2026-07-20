package com.bocaburger131.tamagotchi.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.bocaburger131.tamagotchi.tamagotchi.*

/**
 * The main screen — shows the pet based on its evolution stage.
 * Egg → Baby → Teen with animated pet on a round display.
 */
@Composable
fun MainScreen(
    state: TamagotchiState,
    onAction: (TamagotchiAction) -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pet")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        when (state.stage) {
            EvolutionStage.EGG -> EggScreen(
                progress = state.eggHatchProgress,
                onTap = { onAction(TamagotchiAction.Pet) }
            )
            EvolutionStage.BABY -> BabyScreen(
                state = state,
                infiniteTransition = infiniteTransition,
                onFeed = { onAction(TamagotchiAction.Feed("berry")) },
                onPet = { onAction(TamagotchiAction.Pet) },
                onBath = { onAction(TamagotchiAction.Bath) }
            )
            EvolutionStage.TEEN -> TeenScreen(
                state = state,
                infiniteTransition = infiniteTransition,
                onFeed = { onAction(TamagotchiAction.Feed("berry")) },
                onPet = { onAction(TamagotchiAction.Pet) },
                onBath = { onAction(TamagotchiAction.Bath) }
            )
            EvolutionStage.ADULT,
            EvolutionStage.MEGA -> AdultScreen(
                state = state,
                infiniteTransition = infiniteTransition,
                onFeed = { onAction(TamagotchiAction.Feed("berry")) },
                onPet = { onAction(TamagotchiAction.Pet) },
                onBath = { onAction(TamagotchiAction.Bath) }
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Mood indicator
        Text(
            text = when (state.mood) {
                Mood.HAPPY -> "😊"
                Mood.CONTENT -> "🙂"
                Mood.HUNGRY -> "🍽️"
                Mood.SAD -> "😢"
                Mood.EXCITED -> "🎉"
                Mood.SLEEPY -> "😴"
                Mood.DIRTY -> "🛁"
            },
            fontSize = 14.sp
        )

        // Stats bar for teen and above
        if (state.stage >= EvolutionStage.TEEN) {
            Spacer(modifier = Modifier.height(4.dp))
            StatsBar(
                hunger = state.hunger,
                happiness = state.happiness,
                energy = state.energy,
                cleanliness = state.cleanliness
            )
        }

        // Evolution progress
        if (state.stage != EvolutionStage.EGG) {
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Lv.${state.level}  •  ${state.stage.displayName}  •  ${state.totalCatches} catches",
                fontSize = 10.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
        }
    }
}

// ─── Egg Screen ─────────────────────────────────────────────────────

@Composable
fun EggScreen(
    progress: Float,
    onTap: () -> Unit
) {
    val wiggleAnim = rememberInfiniteTransition(label = "egg")
    val wiggle by wiggleAnim.animateFloat(
        initialValue = -5f,
        targetValue = 5f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "wiggle"
    )

    Column(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) { detectTapGestures { onTap() } },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Canvas(modifier = Modifier.size(100.dp)) {
            drawEgg(
                wiggle = wiggle,
                progress = progress,
                cracked = progress > 0.3f
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (progress >= 1.0f) "Tap to hatch!"
                    else "Tap to comfort",
            fontSize = 12.sp,
            color = Color.Gray,
            textAlign = TextAlign.Center
        )

        // Progress dots
        val dots = (progress * 10).toInt().coerceIn(0, 10)
        Text(
            text = "🟣".repeat(dots) + "⚪".repeat(10 - dots),
            fontSize = 8.sp
        )
    }
}

private fun DrawScope.drawEgg(wiggle: Float, progress: Float, cracked: Boolean) {
    val cx = size.width / 2
    val cy = size.height / 2
    val rx = size.width * 0.3f
    val ry = size.height * 0.4f

    rotate(wiggle, pivot = Offset(cx, cy)) {
        // Egg outline
        drawOval(
            color = Color(0xFFE8E0F0),
            topLeft = Offset(cx - rx, cy - ry),
            size = Size(rx * 2, ry * 2)
        )
        drawOval(
            color = Color(0xFF6C63FF),
            topLeft = Offset(cx - rx, cy - ry),
            size = Size(rx * 2, ry * 2),
            style = Stroke(width = 2f)
        )

        // Crack lines if progress > 30%
        if (cracked) {
            val crackProgress = ((progress - 0.3f) / 0.7f).coerceIn(0f, 1f)
            drawLine(
                color = Color(0xFF6C63FF),
                start = Offset(cx - rx * 0.3f, cy - ry * 0.5f),
                end = Offset(cx + rx * 0.1f * crackProgress, cy + ry * 0.3f * crackProgress),
                strokeWidth = 1.5f
            )
            drawLine(
                color = Color(0xFF6C63FF),
                start = Offset(cx + rx * 0.2f, cy - ry * 0.3f),
                end = Offset(cx + rx * 0.4f * crackProgress, cy + ry * 0.1f),
                strokeWidth = 1.5f
            )
        }
    }
}

// ─── Baby Pet Screen ───────────────────────────────────────────────

@Composable
fun BabyScreen(
    state: TamagotchiState,
    infiniteTransition: InfiniteTransition,
    onFeed: () -> Unit,
    onPet: () -> Unit,
    onBath: () -> Unit
) {
    val bounce by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -8f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bounce"
    )

    Column(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) {
                detectTapGestures { onPet() }
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Canvas(modifier = Modifier.size(90.dp)) {
            drawBabyPet(bounce, state.mood, state.color, state.cleanliness)
        }

        Text(
            text = state.name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "🛁",
            fontSize = 16.sp,
            modifier = Modifier.pointerInput(Unit) { detectTapGestures { onBath() } }
        )
    }
}

private fun DrawScope.drawBabyPet(bounce: Float, mood: Mood, petColor: Int, cleanliness: Int) {
    val cx = size.width / 2
    val cy = size.height / 2 + bounce
    val r = size.width * 0.25f
    val color = Color(petColor)

    // Body (circle)
    drawCircle(color = color, radius = r, center = Offset(cx, cy))

    // Eyes
    val eyeOffsetX = r * 0.3f
    val eyeY = cy - r * 0.15f
    val eyeR = r * 0.12f

    // Left eye
    drawCircle(color = Color.White, radius = eyeR, center = Offset(cx - eyeOffsetX, eyeY))
    drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx - eyeOffsetX, eyeY))
    // Right eye
    drawCircle(color = Color.White, radius = eyeR, center = Offset(cx + eyeOffsetX, eyeY))
    drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx + eyeOffsetX, eyeY))

    // Mouth based on mood
    val mouthY = cy + r * 0.3f
    when (mood) {
        Mood.HAPPY, Mood.EXCITED -> {
            drawArc(
                color = Color(0xFF333333),
                startAngle = 0f,
                sweepAngle = 180f,
                useCenter = false,
                topLeft = Offset(cx - r * 0.2f, mouthY - r * 0.1f),
                size = Size(r * 0.4f, r * 0.2f),
                style = Stroke(width = 1.5f)
            )
        }
        Mood.SAD -> {
            drawArc(
                color = Color(0xFF333333),
                startAngle = 180f,
                sweepAngle = 180f,
                useCenter = false,
                topLeft = Offset(cx - r * 0.2f, mouthY - r * 0.05f),
                size = Size(r * 0.4f, r * 0.15f),
                style = Stroke(width = 1.5f)
            )
        }
        else -> {
            drawLine(
                color = Color(0xFF333333),
                start = Offset(cx - r * 0.2f, mouthY),
                end = Offset(cx + r * 0.2f, mouthY),
                strokeWidth = 1.5f
            )
        }
    }

    // Feet (tiny nubs)
    val footY = cy + r * 0.7f
    drawCircle(color = color.copy(alpha = 0.7f), radius = r * 0.15f, center = Offset(cx - r * 0.3f, footY))
    drawCircle(color = color.copy(alpha = 0.7f), radius = r * 0.15f, center = Offset(cx + r * 0.3f, footY))

    // Dirty tint overlay
    if (cleanliness < 40) {
        val dirtyAlpha = ((40 - cleanliness) / 40f) * 0.45f
        drawCircle(
            color = Color(0xFF6B4226).copy(alpha = dirtyAlpha),
            radius = r * 1.1f,
            center = Offset(cx, cy)
        )
        // Dirt specks
        if (cleanliness < 20) {
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.6f), radius = r * 0.06f, center = Offset(cx - r * 0.4f, cy - r * 0.3f))
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.5f), radius = r * 0.04f, center = Offset(cx + r * 0.5f, cy + r * 0.1f))
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.4f), radius = r * 0.05f, center = Offset(cx + r * 0.2f, cy - r * 0.6f))
        }
    }
}

// ─── Teen Pet Screen ────────────────────────────────────────────────

@Composable
fun TeenScreen(
    state: TamagotchiState,
    infiniteTransition: InfiniteTransition,
    onFeed: () -> Unit,
    onPet: () -> Unit,
    onBath: () -> Unit
) {
    val bounce by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "teen_bounce"
    )

    Column(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) {
                detectTapGestures { onPet() }
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Canvas(modifier = Modifier.size(100.dp)) {
            drawTeenPet(bounce, state.mood, state.color, state.cleanliness)
        }

        Text(
            text = state.name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "🛁",
            fontSize = 16.sp,
            modifier = Modifier.pointerInput(Unit) { detectTapGestures { onBath() } }
        )
    }
}

private fun DrawScope.drawTeenPet(bounce: Float, mood: Mood, petColor: Int, cleanliness: Int) {
    val cx = size.width / 2
    val cy = size.height / 2 + bounce
    val r = size.width * 0.28f
    val color = Color(petColor)

    // Body
    drawCircle(color = color, radius = r, center = Offset(cx, cy))

    // Ears (small triangles)
    val earPath = androidx.compose.ui.graphics.Path().apply {
        moveTo(cx - r * 0.5f, cy - r * 0.6f)
        lineTo(cx - r * 0.3f, cy - r)
        lineTo(cx - r * 0.1f, cy - r * 0.5f)
        close()
    }
    drawPath(earPath, color = color.copy(alpha = 0.8f))

    val earPath2 = androidx.compose.ui.graphics.Path().apply {
        moveTo(cx + r * 0.5f, cy - r * 0.6f)
        lineTo(cx + r * 0.3f, cy - r)
        lineTo(cx + r * 0.1f, cy - r * 0.5f)
        close()
    }
    drawPath(earPath2, color = color.copy(alpha = 0.8f))

    // Eyes (bigger)
    val eyeOffsetX = r * 0.3f
    val eyeY = cy - r * 0.1f
    val eyeR = r * 0.15f
    drawCircle(color = Color.White, radius = eyeR, center = Offset(cx - eyeOffsetX, eyeY))
    drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx - eyeOffsetX, eyeY))
    drawCircle(color = Color.White, radius = eyeR, center = Offset(cx + eyeOffsetX, eyeY))
    drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx + eyeOffsetX, eyeY))

    // Mouth
    val mouthY = cy + r * 0.35f
    when (mood) {
        Mood.HAPPY, Mood.EXCITED -> {
            drawArc(color = Color(0xFF333333), startAngle = 0f, sweepAngle = 180f, useCenter = false,
                topLeft = Offset(cx - r * 0.25f, mouthY - r * 0.15f), size = Size(r * 0.5f, r * 0.3f),
                style = Stroke(width = 2f))
        }
        Mood.SAD -> {
            drawArc(color = Color(0xFF333333), startAngle = 180f, sweepAngle = 180f, useCenter = false,
                topLeft = Offset(cx - r * 0.25f, mouthY - r * 0.05f), size = Size(r * 0.5f, r * 0.2f),
                style = Stroke(width = 2f))
        }
        else -> {
            drawLine(color = Color(0xFF333333),
                start = Offset(cx - r * 0.25f, mouthY), end = Offset(cx + r * 0.25f, mouthY),
                strokeWidth = 2f)
        }
    }

    // Feet
    val footY = cy + r * 0.8f
    drawCircle(color = color.copy(alpha = 0.7f), radius = r * 0.18f, center = Offset(cx - r * 0.35f, footY))
    drawCircle(color = color.copy(alpha = 0.7f), radius = r * 0.18f, center = Offset(cx + r * 0.35f, footY))

    // Dirty tint overlay
    if (cleanliness < 40) {
        val dirtyAlpha = ((40 - cleanliness) / 40f) * 0.45f
        drawCircle(
            color = Color(0xFF6B4226).copy(alpha = dirtyAlpha),
            radius = r * 1.1f,
            center = Offset(cx, cy)
        )
        // Dirt specks
        if (cleanliness < 20) {
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.6f), radius = r * 0.06f, center = Offset(cx - r * 0.4f, cy - r * 0.3f))
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.5f), radius = r * 0.04f, center = Offset(cx + r * 0.5f, cy + r * 0.1f))
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.4f), radius = r * 0.05f, center = Offset(cx + r * 0.2f, cy - r * 0.6f))
        }
    }
}

// ─── Adult Pet Screen ───────────────────────────────────────────────

@Composable
fun AdultScreen(
    state: TamagotchiState,
    infiniteTransition: InfiniteTransition,
    onFeed: () -> Unit,
    onPet: () -> Unit,
    onBath: () -> Unit
) {
    val bounce by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -4f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "adult_bounce"
    )

    Column(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) {
                detectTapGestures { onPet() }
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Canvas(modifier = Modifier.size(110.dp)) {
            drawAdultPet(bounce, state.mood, state.color, state.cleanliness)
        }

        Text(
            text = state.name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "🛁",
            fontSize = 16.sp,
            modifier = Modifier.pointerInput(Unit) { detectTapGestures { onBath() } }
        )
    }
}

private fun DrawScope.drawAdultPet(bounce: Float, mood: Mood, petColor: Int, cleanliness: Int) {
    val cx = size.width / 2
    val cy = size.height / 2 + bounce
    val r = size.width * 0.3f
    val color = Color(petColor)

    // Body
    drawCircle(color = color, radius = r, center = Offset(cx, cy))

    // Crown/crest (mega feature)
    val crownPath = androidx.compose.ui.graphics.Path().apply {
        moveTo(cx - r * 0.4f, cy - r * 0.6f)
        lineTo(cx - r * 0.3f, cy - r * 1.1f)
        lineTo(cx - r * 0.1f, cy - r * 0.8f)
        lineTo(cx, cy - r * 1.2f)
        lineTo(cx + r * 0.1f, cy - r * 0.8f)
        lineTo(cx + r * 0.3f, cy - r * 1.1f)
        lineTo(cx + r * 0.4f, cy - r * 0.6f)
        close()
    }
    drawPath(crownPath, color = color.copy(alpha = 0.9f))

    // Eyes
    val eyeOffsetX = r * 0.25f
    val eyeY = cy - r * 0.1f
    val eyeR = r * 0.12f
    drawCircle(color = Color.White, radius = eyeR, center = Offset(cx - eyeOffsetX, eyeY))
    drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx - eyeOffsetX, eyeY))
    drawCircle(color = Color.White, radius = eyeR, center = Offset(cx + eyeOffsetX, eyeY))
    drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx + eyeOffsetX, eyeY))

    // Determined mouth
    drawLine(color = Color(0xFF333333),
        start = Offset(cx - r * 0.2f, cy + r * 0.3f),
        end = Offset(cx + r * 0.2f, cy + r * 0.3f),
        strokeWidth = 2.5f)

    // Arms
    drawCircle(color = color.copy(alpha = 0.7f), radius = r * 0.15f, center = Offset(cx - r * 0.6f, cy + r * 0.2f))
    drawCircle(color = color.copy(alpha = 0.7f), radius = r * 0.15f, center = Offset(cx + r * 0.6f, cy + r * 0.2f))

    // Dirty tint overlay
    if (cleanliness < 40) {
        val dirtyAlpha = ((40 - cleanliness) / 40f) * 0.45f
        drawCircle(
            color = Color(0xFF6B4226).copy(alpha = dirtyAlpha),
            radius = r * 1.1f,
            center = Offset(cx, cy)
        )
        // Dirt specks
        if (cleanliness < 20) {
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.6f), radius = r * 0.06f, center = Offset(cx - r * 0.4f, cy - r * 0.3f))
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.5f), radius = r * 0.04f, center = Offset(cx + r * 0.5f, cy + r * 0.1f))
            drawCircle(color = Color(0xFF4A2F1A).copy(alpha = 0.4f), radius = r * 0.05f, center = Offset(cx + r * 0.2f, cy - r * 0.6f))
        }
    }
}

// ─── Stats Bar ──────────────────────────────────────────────────────

@Composable
fun StatsBar(hunger: Int, happiness: Int, energy: Int, cleanliness: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        StatDot(label = "🍖", value = hunger)
        StatDot(label = "❤️", value = happiness)
        StatDot(label = "⚡", value = energy)
        StatDot(label = "🛁", value = cleanliness)
    }
}

@Composable
fun StatDot(label: String, value: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, fontSize = 10.sp)
        Text(
            text = value.toString(),
            fontSize = 9.sp,
            color = when {
                value > 60 -> Color(0xFF4CAF50)
                value > 30 -> Color(0xFFFFC107)
                else -> Color(0xFFF44336)
            }
        )
    }
}
