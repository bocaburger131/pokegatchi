package com.bocaburger131.tamagotchi.util

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Notification Listener Service.
 *
 * Reads Pokemon Go catch notifications from the phone and parses them
 * for species name, shiny status, and costume info.
 *
 * This is used by the companion phone app (not the watch direct).
 * The parsed data is sent to the watch via the wearable data layer.
 *
 * Notification format (English):
 *   "Pikachu was caught!"  → species = Pikachu, event = caught
 *   "Pikachu fled!"        → species = Pikachu, event = fled
 *   "✨ Shiny ✨ Pikachu was caught!" → shiny = true
 *
 * Note: CP, actual shiny indicator, and costume info are NOT reliably
 * available in notification text. This is a best-effort parser.
 */
class NotificationListener : NotificationListenerService() {

    companion object {
        const val TAG = "NotifListener"
        const val PACKAGE_POKEMON_GO = "com.nianticlabs.pokemongo"
        const val ACTION_CATCH_EVENT = "com.bocaburger131.CATCH_EVENT"
        const val EXTRA_SPECIES = "species"
        const val EXTRA_EVENT = "event"
        const val EXTRA_SHINY = "shiny"

        // Known Pokemon species names (for multi-word matching)
        private val KNOWN_SPECIES = setOf(
            "Pikachu", "Eevee", "Charizard", "Bulbasaur", "Squirtle",
            "Mewtwo", "Mew", "Mr. Mime", "Mime Jr.", "Ho-Oh", "Tapu Koko",
            "Jangmo-o", "Kommo-o", "Hakamo-o", "Type: Null", "Sirfetch'd"
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != PACKAGE_POKEMON_GO) return

        val notification = sbn.notification
        val extras = notification.extras

        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        if (title != "Pokémon GO" && title != "Pokemon GO") return

        Log.d(TAG, "Notification: $text")

        val parsed = parseNotification(text)
        if (parsed != null) {
            broadcastCatchEvent(parsed)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Not needed
    }

    /**
     * Parse a Pokemon Go notification text.
     *
     * Returns null if the notification isn't a catch/flee event.
     */
    fun parseNotification(text: String): CatchEvent? {
        if (text.isBlank()) return null

        val lower = text.lowercase()

        // Determine event type
        val isCaught = lower.contains("was caught") || lower.contains("was_caught")
        val isFled = lower.contains("fled") || lower.contains("ran away")
        val isItem = lower.contains("received") && lower.contains("items")

        if (!isCaught && !isFled && !isItem) return null

        // Check for shiny indicator
        val isShiny = text.contains("✨") || lower.contains("shiny")

        // Extract species name — heuristic: take the word before "was caught" / "fled"
        val species = extractSpecies(text, isCaught, isFled)

        return CatchEvent(
            species = species,
            event = when {
                isCaught -> "caught"
                isFled -> "fled"
                else -> "item"
            },
            isShiny = isShiny
        )
    }

    private fun extractSpecies(text: String, isCaught: Boolean, isFled: Boolean): String? {
        // Try known multi-word species first
        for (species in KNOWN_SPECIES) {
            if (text.contains(species, ignoreCase = true)) return species
        }

        // Fallback: extract the word before "was caught"
        val pattern = if (isCaught) {
            """(\w+)\s+was caught""".toRegex(RegexOption.IGNORE_CASE)
        } else if (isFled) {
            """(\w+)\s+fled""".toRegex(RegexOption.IGNORE_CASE)
        } else null

        val match = pattern?.find(text)
        return match?.groupValues?.getOrNull(1)
    }

    private fun broadcastCatchEvent(event: CatchEvent) {
        val intent = android.content.Intent(ACTION_CATCH_EVENT).apply {
            putExtra(EXTRA_SPECIES, event.species)
            putExtra(EXTRA_EVENT, event.event)
            putExtra(EXTRA_SHINY, event.isShiny)
        }
        sendBroadcast(intent)
    }

    data class CatchEvent(
        val species: String?,
        val event: String,
        val isShiny: Boolean
    )
}
