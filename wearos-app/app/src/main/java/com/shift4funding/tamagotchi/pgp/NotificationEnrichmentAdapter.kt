package com.shift4funding.tamagotchi.pgp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import com.shift4funding.tamagotchi.ble.BleGattServerService

/**
 * Notification Enrichment Adapter — merges notification-parsed events with BLE events
 * within a 10-second time window, feeding enriched results to the watch UI.
 *
 *   BLE broadcast ──→ recentBleEvents queue ──┐
 *                                              ├── MERGE (10s) ──→ RecentResultsRepository
 *   Notif broadcast ──→ recentNotifEvents ─────┘
 *
 * SAFE-POLISH: Wrapper/adapter only. Reads BLE constants (read-only). No frozen files modified.
 *
 * Guardrails:
 *   - Never block BLE animation waiting for notification text
 *   - BLE mode works normally even without notification access
 */
class NotificationEnrichmentAdapter private constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "NotifEnrichAdapter"
        private const val MERGE_WINDOW_MS = 10_000L
        private const val MAX_ENTRY_AGE_MS = 15_000L
        private const val MAX_QUEUE_SIZE = 30

        private const val ACTION_CATCH_EVENT = "com.shift4funding.CATCH_EVENT"
        private const val EXTRA_SPECIES = "species"
        private const val EXTRA_EVENT = "event"
        private const val EXTRA_SHINY = "shiny"

        @Volatile private var instance: NotificationEnrichmentAdapter? = null

        fun getInstance(context: Context): NotificationEnrichmentAdapter =
            instance ?: synchronized(this) {
                instance ?: NotificationEnrichmentAdapter(context.applicationContext).also { instance = it }
            }
    }

    private data class BleEntry(val timestampMs: Long, val eventType: String)
    private data class NotifEntry(val timestampMs: Long, val species: String?, val event: String?, val isShiny: Boolean)

    private val recentBleEvents = mutableListOf<BleEntry>()
    private val recentNotifEvents = mutableListOf<NotifEntry>()
    private val resultsRepo = RecentResultsRepository.getInstance()
    private var isRegistered = false

    private val bleReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            val rawType = intent.getStringExtra(BleGattServerService.EXTRA_EVENT_TYPE) ?: return
            val now = System.currentTimeMillis()
            synchronized(this@NotificationEnrichmentAdapter) {
                pruneOldEntries(now)
                recentBleEvents.add(BleEntry(now, rawType))
                val match = findMatchingNotification(rawType, now)
                if (match != null) {
                    resultsRepo.add(buildEnriched(rawType, match.species, match.event, match.isShiny))
                    recentNotifEvents.remove(match)
                } else {
                    NotificationEventParser.fromBleEvent(rawType)?.let { resultsRepo.add(it) }
                }
                trimQueue(recentBleEvents)
            }
        }
    }

    private val notifReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            val species = intent.getStringExtra(EXTRA_SPECIES)
            val event = intent.getStringExtra(EXTRA_EVENT) ?: return
            val isShiny = intent.getBooleanExtra(EXTRA_SHINY, false)
            val now = System.currentTimeMillis()
            synchronized(this@NotificationEnrichmentAdapter) {
                pruneOldEntries(now)
                recentNotifEvents.add(NotifEntry(now, species, event, isShiny))
                val match = findMatchingBleEvent(event, now)
                if (match != null) {
                    resultsRepo.add(buildEnriched(match.eventType, species, event, isShiny))
                    recentBleEvents.remove(match)
                } else {
                    resultsRepo.add(NotificationEventParser.fromNotificationExtras(species, event, isShiny))
                }
                trimQueue(recentNotifEvents)
            }
        }
    }

    private fun findMatchingNotification(bleType: String, now: Long): NotifEntry? {
        val expected = when (bleType) {
            BleGattServerService.EVENT_CAUGHT -> "caught"
            BleGattServerService.EVENT_FLED -> "fled"
            BleGattServerService.EVENT_SPUN -> "item"
            else -> return null
        }
        return recentNotifEvents
            .filter { it.event == expected && (now - it.timestampMs) <= MERGE_WINDOW_MS }
            .minByOrNull { now - it.timestampMs }
    }

    private fun findMatchingBleEvent(notifEvent: String, now: Long): BleEntry? {
        val expected = when (notifEvent.lowercase()) {
            "caught" -> BleGattServerService.EVENT_CAUGHT
            "fled" -> BleGattServerService.EVENT_FLED
            "item" -> BleGattServerService.EVENT_SPUN
            else -> return null
        }
        return recentBleEvents
            .filter { it.eventType == expected && (now - it.timestampMs) <= MERGE_WINDOW_MS }
            .minByOrNull { now - it.timestampMs }
    }

    private fun buildEnriched(bleType: String, species: String?, event: String?, isShiny: Boolean): NotificationEvent {
        val canonicalType = CanonicalEventMapper.fromBleEvent(bleType)
        return NotificationEventParser.fromNotificationExtras(species, event, isShiny).copy(
            mergedWithBle = true,
            mergedBleType = canonicalType
        )
    }

    private fun pruneOldEntries(now: Long) {
        val cutoff = now - MAX_ENTRY_AGE_MS
        recentBleEvents.removeAll { it.timestampMs < cutoff }
        recentNotifEvents.removeAll { it.timestampMs < cutoff }
    }

    private fun <T> trimQueue(queue: MutableList<T>) {
        while (queue.size > MAX_QUEUE_SIZE) queue.removeAt(0)
    }

    fun start() {
        if (isRegistered) return
        context.registerReceiver(bleReceiver, IntentFilter(BleGattServerService.ACTION_BLE_EVENT), Context.RECEIVER_NOT_EXPORTED)
        context.registerReceiver(notifReceiver, IntentFilter(ACTION_CATCH_EVENT), Context.RECEIVER_NOT_EXPORTED)
        isRegistered = true
        Log.d(TAG, "NotificationEnrichmentAdapter started")
    }

    fun stop() {
        if (!isRegistered) return
        try { context.unregisterReceiver(bleReceiver) } catch (_: Exception) {}
        try { context.unregisterReceiver(notifReceiver) } catch (_: Exception) {}
        synchronized(this) { recentBleEvents.clear(); recentNotifEvents.clear() }
        isRegistered = false
        Log.d(TAG, "NotificationEnrichmentAdapter stopped")
    }

    fun isRunning(): Boolean = isRegistered
}
