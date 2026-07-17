package com.shift4funding.tamagotchi.pgp

import java.util.UUID
import org.json.JSONObject

/**
 * Canonical event schema v1 — the single source of truth for all BLE/watch events
 * flowing into the Pokégatchi game engine.
 *
 * SAFE-POLISH: This file is NEW. No BLE core files were modified.
 */
data class CanonicalEvent(
    val schemaVersion: Int = 1,
    val eventId: String = UUID.randomUUID().toString(),
    val deviceId: String,
    val sessionId: String,
    val source: String,
    val eventType: String,
    val eventTsMs: Long = System.currentTimeMillis(),
    val ingestTsMs: Long = System.currentTimeMillis(),
    val seq: Long = 0,
    val payload: Map<String, Any?> = emptyMap(),
    val integrity: IntegrityBlock = IntegrityBlock()
) {
    data class IntegrityBlock(
        val nonce: String = randomNonce(),
        val hash: String = ""
    ) {
        companion object {
            private fun randomNonce(): String =
                (1..8).map { "0123456789abcdef"[kotlin.random.Random.nextInt(16)] }.joinToString("")
        }
    }

    /** Event type constants — dotted canonical names. */
    object Types {
        // Catch events
        const val CATCH_SUCCESS   = "pgp.catch.success"
        const val CATCH_FAIL      = "pgp.catch.fail"

        // Spin events
        const val SPIN_SUCCESS    = "pgp.spin.success"
        const val SPIN_FAIL       = "pgp.spin.fail"

        // Encounter events
        const val ENCOUNTER_NEARBY      = "pgp.encounter.nearby"
        const val ENCOUNTER_NEW_SPECIES = "pgp.encounter.new_species"
        const val ENCOUNTER_POKESTOP    = "pgp.encounter.pokestop"

        // Error events
        const val ERROR_BAG_FULL       = "pgp.error.bag_full"
        const val ERROR_OUT_OF_BALLS   = "pgp.error.out_of_balls"

        // System events
        const val SYSTEM_UNKNOWN    = "pgp.unknown"
        const val SYNC_BATCH_SENT   = "pgp.sync.batch.sent"
        const val SYNC_BATCH_ACKED  = "pgp.sync.batch.acked"
        const val SYNC_BATCH_RETRY  = "pgp.sync.batch.retry"
    }

    /** Source constants for provenance tracking. */
    object Sources {
        const val BLE_LED_PARSER     = "wear_ble_led_parser"
        const val NOTIFICATION_PARSE = "phone_notification_parser"
        const val WATCH_UI           = "watch_ui_direct"
    }

    fun toJson(): JSONObject = JSONObject().apply {
        // Top-level fields
        put("schemaVersion", schemaVersion)
        put("eventId", eventId)
        put("deviceId", deviceId)
        put("sessionId", sessionId)
        put("source", source)
        put("eventType", eventType)
        put("eventTsMs", eventTsMs)
        put("ingestTsMs", ingestTsMs)
        put("seq", seq)

        // Payload as JSON sub-object
        val p = JSONObject()
        payload.forEach { (k, v) -> p.put(k, v) }
        put("payload", p)

        // Integrity block
        put("integrity", JSONObject().apply {
            put("nonce", integrity.nonce)
            put("hash", integrity.hash)
        })
    }

    companion object {
        fun fromJson(json: JSONObject): CanonicalEvent {
            val payloadJson = json.optJSONObject("payload") ?: JSONObject()
            val payload = mutableMapOf<String, Any?>()
            payloadJson.keys().forEach { key -> payload[key] = payloadJson.get(key) }

            val integrityJson = json.optJSONObject("integrity") ?: JSONObject()

            return CanonicalEvent(
                schemaVersion = json.optInt("schemaVersion", 1),
                eventId = json.optString("eventId", UUID.randomUUID().toString()),
                deviceId = json.optString("deviceId", "unknown"),
                sessionId = json.optString("sessionId", "unknown"),
                source = json.optString("source", "unknown"),
                eventType = json.optString("eventType", CanonicalEvent.Types.SYSTEM_UNKNOWN),
                eventTsMs = json.optLong("eventTsMs", System.currentTimeMillis()),
                ingestTsMs = json.optLong("ingestTsMs", System.currentTimeMillis()),
                seq = json.optLong("seq", 0),
                payload = payload,
                integrity = IntegrityBlock(
                    nonce = integrityJson.optString("nonce", randomNonce()),
                    hash = integrityJson.optString("hash", "")
                )
            )
        }
    }

}
