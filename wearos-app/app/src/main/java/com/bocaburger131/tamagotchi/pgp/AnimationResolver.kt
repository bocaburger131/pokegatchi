package com.bocaburger131.tamagotchi.pgp

import android.content.Context
import android.util.Log
import java.io.File

/**
 * AnimationResolver — single routing point for all BLE trigger animations.
 *
 * Resolution order (per spec):
 *   1. Temp GIF placeholder — if ALLOW_TEMP_REFERENCE_GIFS && file present
 *   2. Approved original animation — if asset exists in main assets/
 *   3. Fallback simple pulse animation — always available (Compose-based)
 *
 * SAFE-POLISH: New file. No BLE core files modified.
 *              Animation system works with either placeholder or original assets.
 */
object AnimationResolver {

    private const val TAG = "AnimationResolver"

    /** Where temp placeholder GIFs live (dev only, not committed). */
    private const val TEMP_GIF_DIR = "temp_gifs"

    /**
     * Result of resolving an animation for a given BLE trigger event.
     */
    sealed class ResolvedAnimation {
        /** Temp placeholder GIF — dev-only, never shipped. */
        data class TempGif(
            val assetPath: String,
            val eventType: String
        ) : ResolvedAnimation()

        /** Approved original animation asset (bundled in main assets/). */
        data class ApprovedAsset(
            val assetPath: String,
            val eventType: String
        ) : ResolvedAnimation()

        /** Fallback — simple pulse/glow animation rendered in Compose canvas. */
        data class FallbackPulse(
            val eventType: String,
            val color: Long = 0xFF6C63FF
        ) : ResolvedAnimation()

        /** Null object — no animation for this event. */
        data object None : ResolvedAnimation()
    }

    /**
     * Resolve which animation to play for a given BLE event type.
     *
     * @param context Application context for asset access
     * @param eventType Raw BLE event string (e.g., "caught", "fled", "spun")
     * @param allowTempGifs Whether to check temp placeholder GIFs (from PgpConfig)
     * @return ResolvedAnimation for the trigger
     */
    fun resolve(
        context: Context,
        eventType: String,
        allowTempGifs: Boolean = PgpConfig.ALLOW_TEMP_REFERENCE_GIFS
    ): ResolvedAnimation {
        Log.d(TAG, "Resolving animation for: $eventType (tempGifs=$allowTempGifs)")

        // ── Layer 1: Temp GIF placeholder (dev only) ──────────────────
        if (allowTempGifs) {
            val tempResult = resolveTempGif(context, eventType)
            if (tempResult != null) {
                Log.d(TAG, "→ Temp GIF: ${tempResult.assetPath}")
                return tempResult
            }
        }

        // ── Layer 2: Approved original asset ──────────────────────────
        val approvedResult = resolveApprovedAsset(context, eventType)
        if (approvedResult != null) {
            Log.d(TAG, "→ Approved asset: ${approvedResult.assetPath}")
            return approvedResult
        }

        // ── Layer 3: Fallback pulse ───────────────────────────────────
        Log.d(TAG, "→ Fallback pulse for: $eventType")
        return ResolvedAnimation.FallbackPulse(
            eventType = eventType,
            color = colorForEvent(eventType)
        )
    }

    // ─── Private resolvers ──────────────────────────────────────────

    /**
     * Check if a temp placeholder GIF exists for this event type.
     * GIFs are in assets/temp_gifs/ and named by event type.
     * These files are NOT committed to the repo.
     */
    private fun resolveTempGif(context: Context, eventType: String): ResolvedAnimation.TempGif? {
        val filename = gifFilenameForEvent(eventType)
        val fullPath = "$TEMP_GIF_DIR/$filename"

        // Check if the file exists in assets
        return try {
            context.assets.open(fullPath).use { it.close() }
            ResolvedAnimation.TempGif(assetPath = fullPath, eventType = eventType)
        } catch (_: Exception) {
            null // file doesn't exist or can't be opened
        }
    }

    /**
     * Check if an approved original animation asset exists.
     * Approved assets live in assets/triggers/ (committed, release-safe).
     */
    private fun resolveApprovedAsset(context: Context, eventType: String): ResolvedAnimation.ApprovedAsset? {
        val filename = assetFilenameForEvent(eventType)
        val fullPath = "triggers/$filename"

        return try {
            context.assets.open(fullPath).use { it.close() }
            ResolvedAnimation.ApprovedAsset(assetPath = fullPath, eventType = eventType)
        } catch (_: Exception) {
            null
        }
    }

    // ─── Naming conventions ──────────────────────────────────────────

    /**
     * Map event type to temp GIF filename.
     * Place your temp GIFs in wearos-app/app/src/main/assets/temp_gifs/ with these names:
     *   - catch_success.gif   (for "caught")
     *   - catch_fail.gif      (for "fled")
     *   - spin_success.gif    (for "spun")
     *   - encounter_nearby.gif (for "pokemon_nearby")
     */
    private fun gifFilenameForEvent(eventType: String): String = when (eventType) {
        "caught"            -> "catch_success.gif"
        "fled"              -> "catch_fail.gif"
        "spun"              -> "spin_success.gif"
        "pokemon_nearby"    -> "encounter_nearby.gif"
        "new_species"       -> "encounter_new_species.gif"
        "pokestop_nearby"   -> "encounter_pokestop.gif"
        "bag_full"          -> "error_bag_full.gif"
        "out_of_balls"      -> "error_out_of_balls.gif"
        else                -> "unknown.gif"
    }

    /**
     * Map event type to approved original asset filename.
     * Place approved assets in wearos-app/app/src/main/assets/triggers/ as:
     *   - catch_success.json (Lottie) or .webp animation
     */
    private fun assetFilenameForEvent(eventType: String): String = when (eventType) {
        "caught"            -> "catch_success.webp"
        "fled"              -> "catch_fail.webp"
        "spun"              -> "spin_success.webp"
        "pokemon_nearby"    -> "encounter_nearby.webp"
        "new_species"       -> "encounter_new_species.webp"
        "pokestop_nearby"   -> "encounter_pokestop.webp"
        "bag_full"          -> "error_bag_full.webp"
        "out_of_balls"      -> "error_out_of_balls.webp"
        else                -> "unknown.webp"
    }

    /**
     * Map event type to a fallback pulse color.
     */
    private fun colorForEvent(eventType: String): Long = when (eventType) {
        "caught"            -> 0xFF4CAF50  // green
        "fled"              -> 0xFFF44336  // red
        "spun"              -> 0xFF2196F3  // blue
        "pokemon_nearby"    -> 0xFFFFC107  // amber
        "new_species"       -> 0xFF9C27B0  // purple
        "pokestop_nearby"   -> 0xFF00BCD4  // cyan
        "bag_full"          -> 0xFFFF9800  // orange
        "out_of_balls"      -> 0xFF795548  // brown
        else                -> 0xFF6C63FF  // default purple
    }
}
