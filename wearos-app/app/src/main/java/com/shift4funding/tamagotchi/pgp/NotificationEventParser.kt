package com.shift4funding.tamagotchi.pgp

import com.shift4funding.tamagotchi.ble.BleGattServerService
import com.shift4funding.tamagotchi.pgp.NotificationEvent.ParsedType

/**
 * Tiny parser — only matches known patterns. No NLP, no fuzzy AI.
 *
 * SAFE-POLISH: New file in pgp/. Reads BLE constants (read-only).
 *
 * Guardrail: If text doesn't match a known pattern, classify as UNKNOWN.
 */
object NotificationEventParser {

    const val PACKAGE_POKEMON_GO = "com.nianticlabs.pokemongo"

    private const val CONFIDENCE_CAUGHT_NOTIF = 0.92f
    private const val CONFIDENCE_FLED_NOTIF = 0.88f
    private const val CONFIDENCE_ITEM_NOTIF = 0.85f
    private const val CONFIDENCE_BAG_FULL_BLE = 0.95f
    private const val CONFIDENCE_BLE_DIRECT = 0.90f

    fun fromNotificationExtras(
        species: String?,
        event: String?,
        isShiny: Boolean = false,
        title: String = "",
        text: String = ""
    ): NotificationEvent {
        if (event == null) return NotificationEvent.unknown(PACKAGE_POKEMON_GO, title, text)
        return when (event.lowercase()) {
            "caught" -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = title, text = text,
                parsedType = ParsedType.CAUGHT, parsedName = species,
                confidence = CONFIDENCE_CAUGHT_NOTIF
            )
            "fled" -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = title, text = text,
                parsedType = ParsedType.FLED, parsedName = species,
                confidence = CONFIDENCE_FLED_NOTIF
            )
            "item" -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = title, text = text,
                parsedType = ParsedType.POKESTOP_ITEMS,
                confidence = CONFIDENCE_ITEM_NOTIF
            )
            else -> NotificationEvent.unknown(PACKAGE_POKEMON_GO, title, text)
        }
    }

    fun fromBleEvent(bleEventType: String?): NotificationEvent? {
        if (bleEventType == null) return null
        return when (bleEventType) {
            BleGattServerService.EVENT_BAG_FULL -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = "bag full",
                parsedType = ParsedType.BAG_FULL, confidence = CONFIDENCE_BAG_FULL_BLE
            )
            BleGattServerService.EVENT_CAUGHT -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = "caught",
                parsedType = ParsedType.CAUGHT, confidence = CONFIDENCE_BLE_DIRECT
            )
            BleGattServerService.EVENT_FLED -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = "fled",
                parsedType = ParsedType.FLED, confidence = CONFIDENCE_BLE_DIRECT
            )
            BleGattServerService.EVENT_SPUN -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = "spun",
                parsedType = ParsedType.POKESTOP_ITEMS, confidence = CONFIDENCE_BLE_DIRECT
            )
            else -> null
        }
    }

    fun fromRawText(text: String, species: String? = null): NotificationEvent? {
        if (text.isBlank()) return null
        val lower = text.lowercase()
        return when {
            lower.contains("was caught") || lower.contains("caught") -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.CAUGHT, parsedName = species,
                confidence = CONFIDENCE_CAUGHT_NOTIF
            )
            lower.contains("fled") || lower.contains("ran away") -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.FLED, parsedName = species,
                confidence = CONFIDENCE_FLED_NOTIF
            )
            lower.contains("bag full") || lower.contains("bag is full") -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.BAG_FULL, confidence = CONFIDENCE_BAG_FULL_BLE
            )
            lower.contains("items collected") || (lower.contains("received") && lower.contains("items")) -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.POKESTOP_ITEMS, confidence = CONFIDENCE_ITEM_NOTIF
            )
            lower.contains("pokestop") -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.POKESTOP_ITEMS, confidence = CONFIDENCE_ITEM_NOTIF
            )
            lower.contains("connected") -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.CONNECTED, confidence = 0.98f
            )
            lower.contains("disconnected") -> NotificationEvent(
                sourcePackage = PACKAGE_POKEMON_GO, title = "", text = text,
                parsedType = ParsedType.DISCONNECTED, confidence = 0.98f
            )
            else -> null
        }
    }
}
