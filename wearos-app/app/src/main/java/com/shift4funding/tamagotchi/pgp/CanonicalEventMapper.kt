package com.shift4funding.tamagotchi.pgp

import com.shift4funding.tamagotchi.ble.BleGattServerService

/**
 * Maps raw BLE broadcast events and notification-parsed events into canonical event types.
 *
 * SAFE-POLISH: Reads from existing BLE constants (read-only). No BLE core files modified.
 */
object CanonicalEventMapper {

    /**
     * Map a raw BLE event type string (from BleGattServerService constants) to a canonical
     * dotted event type name.
     */
    fun fromBleEvent(rawType: String?): String = when (rawType) {
        BleGattServerService.EVENT_CAUGHT          -> CanonicalEvent.Types.CATCH_SUCCESS
        BleGattServerService.EVENT_FLED            -> CanonicalEvent.Types.CATCH_FAIL
        BleGattServerService.EVENT_SPUN            -> CanonicalEvent.Types.SPIN_SUCCESS
        BleGattServerService.EVENT_POKEMON_NEARBY  -> CanonicalEvent.Types.ENCOUNTER_NEARBY
        BleGattServerService.EVENT_NEW_SPECIES     -> CanonicalEvent.Types.ENCOUNTER_NEW_SPECIES
        BleGattServerService.EVENT_POKESTOP_NEARBY -> CanonicalEvent.Types.ENCOUNTER_POKESTOP
        BleGattServerService.EVENT_BAG_FULL        -> CanonicalEvent.Types.ERROR_BAG_FULL
        BleGattServerService.EVENT_OUT_OF_BALLS    -> CanonicalEvent.Types.ERROR_OUT_OF_BALLS
        else                                       -> CanonicalEvent.Types.SYSTEM_UNKNOWN
    }

    /**
     * Map a notification-parsed event (catch/flee/item) to a canonical event type.
     */
    fun fromNotificationEvent(notifEvent: String): String = when (notifEvent.lowercase()) {
        "caught" -> CanonicalEvent.Types.CATCH_SUCCESS
        "fled"   -> CanonicalEvent.Types.CATCH_FAIL
        "item"   -> CanonicalEvent.Types.SPIN_SUCCESS
        else     -> CanonicalEvent.Types.SYSTEM_UNKNOWN
    }

    /**
     * Build a payload map from a raw BLE event type, optionally enriched with notification data.
     */
    fun buildPayload(
        rawType: String?,
        species: String? = null,
        isShiny: Boolean = false
    ): Map<String, Any?> = mutableMapOf<String, Any?>().apply {
        put("rawType", rawType ?: "unknown")
        when (rawType) {
            BleGattServerService.EVENT_CAUGHT -> {
                put("confidence", 0.92)
                if (species != null) put("species", species)
                if (isShiny) put("shiny", true)
            }
            BleGattServerService.EVENT_FLED -> {
                put("confidence", 0.88)
                if (species != null) put("species", species)
            }
            BleGattServerService.EVENT_SPUN -> {
                put("confidence", 0.95)
            }
            BleGattServerService.EVENT_BAG_FULL,
            BleGattServerService.EVENT_OUT_OF_BALLS -> {
                put("critical", true)
            }
        }
    }
}