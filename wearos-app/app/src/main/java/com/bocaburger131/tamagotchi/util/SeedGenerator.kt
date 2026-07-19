package com.bocaburger131.tamagotchi.util

import android.content.Context

/**
 * Generates the unique seed for a player's pet.
 *
 * The seed is generated once on first launch and persisted.
 * It determines:
 * - Base IVs (1-31 per stat)
 * - Starting color palette
 * - Personality traits
 * - Evolution branch preferences
 *
 * In the full version, the seed is derived from:
 *   seed = hash(account_id + first_catch_time + initial_buddy_species)
 *
 * For V1, we generate a random seed on first launch.
 */
object SeedGenerator {

    private const val PREFS_NAME = "tamagotchi_seed"
    private const val KEY_SEED = "pet_seed"
    private const val KEY_FIRST_LAUNCH = "first_launch"

    /**
     * Generate or retrieve the persistent seed.
     * Returns the same seed every time for this device.
     */
    fun generate(context: Context? = null): Long {
        if (context != null) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existing = prefs.getLong(KEY_SEED, 0L)
            if (existing != 0L) return existing

            val newSeed = System.currentTimeMillis() xor
                    (System.nanoTime() shl 16) xor
                    (Runtime.getRuntime().hashCode().toLong() shl 8)

            prefs.edit().putLong(KEY_SEED, newSeed).apply()
            prefs.edit().putBoolean(KEY_FIRST_LAUNCH, false).apply()

            return newSeed
        }

        // Fallback for preview/testing
        return 0xABCD1234L
    }
}
