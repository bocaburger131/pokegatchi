package com.bocaburger131.tamagotchi.minigames

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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.bocaburger131.tamagotchi.tamagotchi.MiniGameResult
import com.bocaburger131.tamagotchi.tamagotchi.StatType
import kotlin.math.abs
import kotlin.random.Random

// ─── Shared Types ──────────────────────────────────────────────────

data class MiniGameState(
    val name: String,
    val score: Int = 0,
    val maxScore: Int = 10,
    val isComplete: Boolean = false,
    val result: MiniGameResult? = null,
    val feedback: String = ""
)

// ─── Pet & Coo ─────────────────────────────────────────────────────
// Tap the pet repeatedly. It reacts with animations.
// Trains: Bond

@Composable
fun PetAndCooGame(
    petColor: Int = 0xFF6C63FF.toInt(),
    onComplete: (MiniGameResult) -> Unit
) {
    var taps by remember { mutableIntStateOf(0) }
    var lastTapTime by remember { mutableLongStateOf(0L) }
    var petState by remember { mutableIntStateOf(0) } // 0=idle, 1=happy, 2=giggle
    val maxTaps = 10

    val infiniteTransition = rememberInfiniteTransition(label = "petandcoo")
    val bob by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = -5f,
        animationSpec = infiniteRepeatable(tween(1000, easing = EaseInOutCubic), RepeatMode.Reverse),
        label = "bob"
    )

    Box(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) {
                detectTapGestures {
                    taps = (taps + 1).coerceAtMost(maxTaps)
                    lastTapTime = System.currentTimeMillis()
                    petState = if (taps % 3 == 0) 2 else 1

                    if (taps >= maxTaps) {
                        val perfect = taps == maxTaps
                        onComplete(MiniGameResult(
                            score = taps * 10,
                            stat = StatType.BOND,
                            perfect = perfect
                        ))
                    }
                }
            },
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(100.dp)) {
            drawPetAndCooPet(bob, petState, petColor)
        }

        Text(
            text = "${taps}/$maxTaps",
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 4.dp),
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )

        if (taps < maxTaps) {
            Text(
                text = "Tap to pet!",
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
                fontSize = 11.sp,
                color = Color.Gray
            )
        } else {
            Text(
                text = "💕 Love you!",
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
                fontSize = 11.sp,
                color = Color(0xFFFF69B4)
            )
        }
    }
}

private fun DrawScope.drawPetAndCooPet(bob: Float, state: Int, color: Int) {
    val cx = size.width / 2
    val cy = size.height / 2 + bob
    val r = size.width * 0.3f
    val petColor = Color(color)

    // Body
    drawCircle(color = petColor, radius = r, center = Offset(cx, cy))

    // Eyes (happy when petted)
    val eyeY = cy - r * 0.15f
    val eyeR = r * 0.12f
    val eyeOffsetX = r * 0.3f

    if (state == 2) {
        // Giggle — squeezed eyes
        drawLine(color = Color.Black, start = Offset(cx - eyeOffsetX - eyeR, eyeY),
            end = Offset(cx - eyeOffsetX + eyeR, eyeY), strokeWidth = 2f)
        drawLine(color = Color.Black, start = Offset(cx + eyeOffsetX - eyeR, eyeY),
            end = Offset(cx + eyeOffsetX + eyeR, eyeY), strokeWidth = 2f)
    } else {
        drawCircle(color = Color.White, radius = eyeR, center = Offset(cx - eyeOffsetX, eyeY))
        drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx - eyeOffsetX, eyeY))
        drawCircle(color = Color.White, radius = eyeR, center = Offset(cx + eyeOffsetX, eyeY))
        drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx + eyeOffsetX, eyeY))
    }

    // Mouth
    val mouthY = cy + r * 0.35f
    drawArc(color = Color(0xFF333333), startAngle = 0f, sweepAngle = 180f, useCenter = false,
        topLeft = Offset(cx - r * 0.2f, mouthY - r * 0.1f), size = Size(r * 0.4f, r * 0.2f),
        style = Stroke(width = 1.5f))

    // Heart on giggle
    if (state == 2) {
        drawCircle(color = Color(0xFFFF69B4), radius = r * 0.1f, center = Offset(cx + r * 0.5f, cy - r * 0.4f))
    }
}

// ─── Berry Catch ───────────────────────────────────────────────────
// A berry bounces across the screen. Tap it when it's in the target zone.
// Trains: Weight (Feed)

@Composable
fun BerryCatchGame(
    onComplete: (MiniGameResult) -> Unit
) {
    var score by remember { mutableIntStateOf(0) }
    var missed by remember { mutableIntStateOf(0) }
    var berryX by remember { mutableFloatStateOf(0f) }
    var direction by remember { mutableIntStateOf(1) }
    var gameActive by remember { mutableStateOf(true) }
    val maxScore = 8

    // Berry bounces back and forth
    LaunchedEffect(gameActive) {
        while (gameActive && score < maxScore) {
            berryX += direction * 0.03f
            if (berryX > 1f || berryX < 0f) direction *= -1
            kotlinx.coroutines.delay(16) // ~60fps
        }
    }

    // Target zone (middle 30%)
    val targetStart = 0.35f
    val targetEnd = 0.65f
    val inZone = berryX in targetStart..targetEnd

    Box(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) {
                detectTapGestures {
                    if (!gameActive) return@detectTapGestures
                    if (inZone) {
                        score++
                        if (score >= maxScore) {
                            gameActive = false
                            onComplete(MiniGameResult(
                                score = score * 10,
                                stat = StatType.WEIGHT,
                                perfect = missed == 0
                            ))
                        }
                    } else {
                        missed++
                        if (missed >= 3) {
                            gameActive = false
                            onComplete(MiniGameResult(
                                score = score * 10,
                                stat = StatType.WEIGHT
                            ))
                        }
                    }
                }
            },
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(140.dp)) {
            // Berry
            val berryPosX = size.width * berryX
            val berryPosY = size.height * 0.5f

            // Target zone indicator
            drawRect(
                color = if (inZone) Color(0x4400FF00) else Color(0x44FF0000),
                topLeft = Offset(size.width * targetStart, size.height * 0.3f),
                size = Size(size.width * (targetEnd - targetStart), size.height * 0.4f)
            )

            // Berry
            drawCircle(color = Color(0xFFFF4081), radius = 15f, center = Offset(berryPosX, berryPosY))
            drawCircle(color = Color(0xFFE91E63), radius = 10f, center = Offset(berryPosX - 2f, berryPosY - 2f))
        }

        Text(
            text = "Score: $score  Miss: $missed/3",
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 4.dp),
            fontSize = 11.sp
        )

        Text(
            text = if (inZone) "TAP NOW!" else "Wait...",
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
            fontSize = 11.sp,
            color = if (inZone) Color(0xFF4CAF50) else Color.Gray,
            fontWeight = if (inZone) FontWeight.Bold else FontWeight.Normal
        )
    }
}

// ─── Peek-a-Boo ────────────────────────────────────────────────────
// Pet covers its eyes. Tap after 2-3 seconds when it peeks.
// Tap too early = "not ready" animation. Tap too late = sad peek.
// Trains: Bond, Patience (Discipline)

@Composable
fun PeekABooGame(
    petColor: Int = 0xFF6C63FF.toInt(),
    onComplete: (MiniGameResult) -> Unit
) {
    var round by remember { mutableIntStateOf(0) }
    var phase by remember { mutableIntStateOf(0) } // 0=covered, 1=peeking, 2=too_early, 3=too_late
    var score by remember { mutableIntStateOf(0) }
    val maxRounds = 5

    // Random peek timing (2-4 seconds)
    val peekDelay = remember(round) { Random.nextLong(2000, 4000) }
    val peekWindow = 1500L // window to tap after peek
    var peekStartTime by remember { mutableLongStateOf(0L) }

    // Start round
    LaunchedEffect(round) {
        phase = 0
        kotlinx.coroutines.delay(500)
        // Cover eyes
        kotlinx.coroutines.delay(peekDelay)
        phase = 1
        peekStartTime = System.currentTimeMillis()

        // Wait for tap window
        kotlinx.coroutines.delay(peekWindow)
        if (phase == 1) {
            phase = 3 // too late
            kotlinx.coroutines.delay(1000)
            if (round < maxRounds) {
                round++
            } else {
                onComplete(MiniGameResult(score = score * 10, stat = StatType.BOND))
            }
        }
    }

    Box(
        modifier = Modifier
            .size(160.dp)
            .pointerInput(Unit) {
                detectTapGestures {
                    when (phase) {
                        0 -> {
                            phase = 2 // too early
                        }
                        1 -> {
                            // Perfect!
                            score++
                            phase = 0
                            if (round + 1 >= maxRounds) {
                                onComplete(MiniGameResult(
                                    score = score * 10,
                                    stat = StatType.BOND,
                                    perfect = score == maxRounds
                                ))
                            } else {
                                round++
                            }
                        }
                    }
                }
            },
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(100.dp)) {
            drawPeekPet(phase, petColor)
        }

        Text(
            text = when (phase) {
                0 -> "🙈 Peek-a..."
                1 -> "👀 BOO!"
                2 -> "✋ Not yet!"
                3 -> "😢 Aw..."
                else -> ""
            },
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "Round ${round + 1}/$maxRounds • Score: $score",
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 4.dp),
            fontSize = 10.sp,
            color = Color.Gray
        )
    }
}

private fun DrawScope.drawPeekPet(phase: Int, color: Int) {
    val cx = size.width / 2
    val cy = size.height / 2
    val r = size.width * 0.3f
    val petColor = Color(color)

    // Body
    drawCircle(color = petColor, radius = r, center = Offset(cx, cy))

    val eyeY = cy - r * 0.15f
    val eyeOffsetX = r * 0.3f

    when (phase) {
        0 -> {
            // Eyes covered
            drawCircle(color = petColor.copy(alpha = 0.6f), radius = r * 0.25f,
                center = Offset(cx, eyeY))
        }
        1 -> {
            // Peeking — big excited eyes
            val eyeR = r * 0.15f
            drawCircle(color = Color.White, radius = eyeR, center = Offset(cx - eyeOffsetX, eyeY))
            drawCircle(color = Color.Black, radius = eyeR * 0.6f, center = Offset(cx - eyeOffsetX, eyeY))
            drawCircle(color = Color.White, radius = eyeR, center = Offset(cx + eyeOffsetX, eyeY))
            drawCircle(color = Color.Black, radius = eyeR * 0.6f, center = Offset(cx + eyeOffsetX, eyeY))
            // Big smile
            drawArc(color = Color(0xFF333333), startAngle = 0f, sweepAngle = 180f, useCenter = false,
                topLeft = Offset(cx - r * 0.25f, cy + r * 0.2f), size = Size(r * 0.5f, r * 0.3f),
                style = Stroke(width = 2f))
        }
        2 -> {
            // Too early — surprised
            drawCircle(color = Color.White, radius = r * 0.12f, center = Offset(cx - eyeOffsetX, eyeY))
            drawCircle(color = Color.Black, radius = r * 0.08f, center = Offset(cx - eyeOffsetX, eyeY))
            drawCircle(color = Color.White, radius = r * 0.12f, center = Offset(cx + eyeOffsetX, eyeY))
            drawCircle(color = Color.Black, radius = r * 0.08f, center = Offset(cx + eyeOffsetX, eyeY))
            val mouthY = cy + r * 0.35f
            drawCircle(color = Color(0xFF333333), radius = r * 0.08f, center = Offset(cx, mouthY))
        }
        3 -> {
            // Too late — sad eyes
            val eyeR = r * 0.12f
            drawCircle(color = Color.White, radius = eyeR, center = Offset(cx - eyeOffsetX, eyeY))
            drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx - eyeOffsetX, eyeY))
            drawCircle(color = Color.White, radius = eyeR, center = Offset(cx + eyeOffsetX, eyeY))
            drawCircle(color = Color.Black, radius = eyeR * 0.5f, center = Offset(cx + eyeOffsetX, eyeY))
            val mouthY = cy + r * 0.35f
            drawArc(color = Color(0xFF333333), startAngle = 180f, sweepAngle = 180f, useCenter = false,
                topLeft = Offset(cx - r * 0.2f, mouthY - r * 0.05f), size = Size(r * 0.4f, r * 0.15f),
                style = Stroke(width = 1.5f))
        }
    }
}

private fun DrawScope.Stroke(width: Float) = androidx.compose.ui.graphics.drawscope.Stroke(width = width)
