package com.shift4funding.tamagotchi.pgp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import com.shift4funding.tamagotchi.ble.BleGattServerService
import java.util.UUID

/**
 * Event Capture Adapter — subscribes to BLE broadcasts and notification-parsed events
 * as a parallel listener, WITHOUT modifying any BLE core files.
 *
 * SAFE-POLISH: Wrapper/adapter only. Reads broadcast intents that BLE service already emits.
 * No changes to BleGattServerService, MainActivity, or AndroidManifest.
 */
class EventCaptureAdapter(
    private val context: Context,
    private val eventRecorder: EventRecorder = EventLogRepository(context),
    private val deviceId: String = loadOrGenerateDeviceId(context),
    private val sessionId: String = UUID.randomUUID().toString()
) {
    companion object {
        private const val TAG = "EventCaptureAdapter"
        private const val ACTION_CATCH_EVENT = "com.shift4funding.CATCH_EVENT"
        const val EXTRA_SPECIES = "species"
        const val EXTRA_EVENT = "event"
        const val EXTRA_SHINY = "shiny"

        private const val PREFS_DEVICE_ID = "tamagotchi_pgp"
        private const val KEY_DEVICE_ID = "pgp_device_id"

        @Volatile private var instance: EventCaptureAdapter? = null

        fun getInstance(context: Context): EventCaptureAdapter {
            return instance ?: synchronized(this) {
                instance ?: EventCaptureAdapter(context.applicationContext).also { instance = it }
            }
        }

        private fun loadOrGenerateDeviceId(ctx: Context): String {
            val prefs = ctx.getSharedPreferences(PREFS_DEVICE_ID, Context.MODE_PRIVATE)
            val existing = prefs.getString(KEY_DEVICE_ID, null)
            if (existing != null) return existing
            val newId = "watch-${UUID.randomUUID().toString().take(8)}"
            prefs.edit().putString(KEY_DEVICE_ID, newId).apply()
            return newId
        }
    }

    private var isRegistered = false
    private var onEventRecorded: ((CanonicalEvent) -> Unit)? = null

    /** Callback fired after each event is successfully recorded to the log. */
    fun setOnEventRecorded(callback: ((CanonicalEvent) -> Unit)?) {
        onEventRecorded = callback
    }

    /** BLE event receiver — listens for ACTION_BLE_EVENT broadcast. */
    private val bleReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            val rawType = intent.getStringExtra(BleGattServerService.EXTRA_EVENT_TYPE)
            if (rawType == null) {
                Log.w(TAG, "BLE event received with null event_type")
                return
            }
            Log.d(TAG, "BLE event captured: rawType=$rawType")

            val canonicalType = CanonicalEventMapper.fromBleEvent(rawType)
            val payload = CanonicalEventMapper.buildPayload(rawType)

            val event = CanonicalEvent(
                deviceId = deviceId,
                sessionId = sessionId,
                source = CanonicalEvent.Sources.BLE_LED_PARSER,
                eventType = canonicalType,
                eventTsMs = System.currentTimeMillis(),
                payload = payload
            )

            recordAndNotify(event)
        }
    }

    /** Notification event receiver — listens for ACTION_CATCH_EVENT broadcast. */
    private val notifReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            val species = intent.getStringExtra(EXTRA_SPECIES)
            val event = intent.getStringExtra(EXTRA_EVENT)
            val isShiny = intent.getBooleanExtra(EXTRA_SHINY, false)

            if (event == null) {
                Log.w(TAG, "Notification event received with null event field")
                return
            }

            Log.d(TAG, "Notification event captured: event=$event species=$species shiny=$isShiny")

            val canonicalType = CanonicalEventMapper.fromNotificationEvent(event)
            val payload = CanonicalEventMapper.buildPayload(
                rawType = event,
                species = species,
                isShiny = isShiny
            )

            val canonicalEvent = CanonicalEvent(
                deviceId = deviceId,
                sessionId = sessionId,
                source = CanonicalEvent.Sources.NOTIFICATION_PARSE,
                eventType = canonicalType,
                eventTsMs = System.currentTimeMillis(),
                payload = payload
            )

            recordAndNotify(canonicalEvent)
        }
    }

    private fun recordAndNotify(event: CanonicalEvent) {
        try {
            val recorded = eventRecorder.record(event)
            onEventRecorded?.invoke(recorded)
            Log.d(TAG, "Event recorded: seq=${recorded.seq} type=${recorded.eventType} id=${recorded.eventId}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to record event: ${e.message}", e)
        }
    }

    /** Start listening for BLE and notification broadcasts. */
    fun start() {
        if (isRegistered) {
            Log.w(TAG, "Already registered — ignoring duplicate start()")
            return
        }

        // BLE events
        context.registerReceiver(
            bleReceiver,
            IntentFilter(BleGattServerService.ACTION_BLE_EVENT),
            Context.RECEIVER_NOT_EXPORTED
        )

        // Notification events
        context.registerReceiver(
            notifReceiver,
            IntentFilter(ACTION_CATCH_EVENT),
            Context.RECEIVER_NOT_EXPORTED
        )

        isRegistered = true
        Log.d(TAG, "EventCaptureAdapter started — deviceId=$deviceId sessionId=$sessionId")
    }

    /** Stop listening and release receivers. */
    fun stop() {
        if (!isRegistered) return
        try {
            context.unregisterReceiver(bleReceiver)
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering BLE receiver: ${e.message}")
        }
        try {
            context.unregisterReceiver(notifReceiver)
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering notification receiver: ${e.message}")
        }
        isRegistered = false
        Log.d(TAG, "EventCaptureAdapter stopped")
    }

    /** Get the current event count from the recorder. */
    fun getEventCount(): Long = eventRecorder.getEventCount()

    /** Get the current session ID. */
    fun getSessionId(): String = sessionId

    /** Get the device ID. */
    fun getDeviceId(): String = deviceId
}