package com.shift4funding.tamagotchi.pgp

/**
 * Normalized notification event model — enrichment-only, never blocks BLE.
 *
 * SAFE-POLISH: New file in pgp/. No frozen files modified.
 *
 * Guardrail: If parser can't classify, store as UNKNOWN with raw text.
 */
data class NotificationEvent(
    val sourcePackage: String,
    val title: String,
    val text: String,
    val timestamp: Long,
    val parsedType: ParsedType,
    val parsedName: String? = null,
    val confidence: Float = 0f,
    val mergedWithBle: Boolean = false,
    val mergedBleType: String? = null
) {
    enum class ParsedType {
        CAUGHT, FLED, BAG_FULL, POKESTOP_ITEMS, CONNECTED, DISCONNECTED, UNKNOWN;

        val displayLabel: String get() = when (this) {
            CAUGHT -> "Caught"
            FLED -> "Ran away"
            BAG_FULL -> "Bag full"
            POKESTOP_ITEMS -> "Items collected"
            CONNECTED -> "Connected"
            DISCONNECTED -> "Disconnected"
            UNKNOWN -> "Unknown"
        }
    }

    fun summary(): String = when (parsedType) {
        ParsedType.CAUGHT -> if (parsedName != null) "Caught $parsedName" else "Caught!"
        ParsedType.FLED -> if (parsedName != null) "$parsedName fled" else "Ran away"
        ParsedType.BAG_FULL -> "Bag full"
        ParsedType.POKESTOP_ITEMS -> "Items collected"
        ParsedType.CONNECTED -> "Connected"
        ParsedType.DISCONNECTED -> "Disconnected"
        ParsedType.UNKNOWN -> text.ifBlank { "Event" }
    }

    companion object {
        fun unknown(
            sourcePackage: String,
            title: String,
            text: String,
            timestamp: Long = System.currentTimeMillis()
        ): NotificationEvent = NotificationEvent(
            sourcePackage = sourcePackage,
            title = title,
            text = text,
            timestamp = timestamp,
            parsedType = ParsedType.UNKNOWN,
            confidence = 0f
        )
    }
}
