package com.shift4funding.tamagotchi.pgp

import android.content.Context
import com.shift4funding.tamagotchi.BuildConfig

/**
 * PGP mode and asset configuration — single source of truth for runtime behavior.
 *
 * Two independent toggles:
 *   1. pgpMode     — PGP_ONLY vs PGP_PLUS_POKEGATCHI (runtime, persisted)
 *   2. allowTempGifs — ALLOW_TEMP_REFERENCE_GIFS from BuildConfig (compile-time)
 *
 * SAFE-POLISH: New file. No BLE core files modified.
 *              pgpMode and asset source are independent toggles per spec.
 */
object PgpConfig {

    /** Runtime mode — persisted in SharedPreferences, survives restart. */
    enum class PgpMode {
        PGP_ONLY,             // BLE triggers animate locally only, no sync
        PGP_PLUS_POKEGATCHI   // BLE triggers animate AND export/sync events
    }

    private const val PREFS_NAME = "tamagotchi_pgp_config"
    private const val KEY_PGP_MODE = "pgp_mode"

    @Volatile
    private var _pgpMode: PgpMode? = null

    /**
     * Compile-time flag: true in dev builds, false in prod.
     * Controlled by product flavor in build.gradle.kts.
     */
    val ALLOW_TEMP_REFERENCE_GIFS: Boolean
        get() = BuildConfig.ALLOW_TEMP_REFERENCE_GIFS

    /**
     * Get the current PGP mode. Defaults to PGP_PLUS_POKEGATCHI if never set.
     */
    fun getPgpMode(context: Context): PgpMode {
        _pgpMode?.let { return it }
        val prefs = context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val stored = prefs.getString(KEY_PGP_MODE, null)
        val mode = stored?.let { try { PgpMode.valueOf(it) } catch (_: Exception) { null } }
            ?: PgpMode.PGP_PLUS_POKEGATCHI
        _pgpMode = mode
        return mode
    }

    /**
     * Set the PGP mode at runtime. Persisted immediately.
     */
    fun setPgpMode(context: Context, mode: PgpMode) {
        _pgpMode = mode
        context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PGP_MODE, mode.name)
            .apply()
    }

    /**
     * Should sync/export events be enabled? True in PGP_PLUS_POKEGATCHI mode only.
     */
    fun isSyncEnabled(context: Context): Boolean =
        getPgpMode(context) == PgpMode.PGP_PLUS_POKEGATCHI

    /**
     * Convenience: are temp GIFs allowed right now?
     * Compile-time flag only — does not consult runtime.
     */
    fun isTempGifAllowed(): Boolean = ALLOW_TEMP_REFERENCE_GIFS

    /** Clear cached mode (useful for testing). */
    fun invalidateCache() {
        _pgpMode = null
    }
}
