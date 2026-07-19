package com.bocaburger131.tamagotchi.pgp

/**
 * Interface for recording canonical events. Decouples capture from storage,
 * allowing for test doubles and future storage backends.
 *
 * SAFE-POLISH: Interface-only; no BLE core files touched.
 */
interface EventRecorder {
    /**
     * Record a canonical event. Returns the event with its assigned sequence number.
     * MUST be append-only — never modifies or deletes existing events.
     */
    fun record(event: CanonicalEvent): CanonicalEvent

    /** Get the total number of events recorded. */
    fun getEventCount(): Long

    /** Get the most recent event (or null if none recorded). */
    fun getLatestEvent(): CanonicalEvent?

    /** Export all recorded events as a JSON array string. */
    fun exportAll(): String

    /** Export events since a given sequence number (exclusive). */
    fun exportSince(afterSeq: Long): String

    /** Check if an event ID already exists in the log (dedupe check). */
    fun hasEvent(eventId: String): Boolean

    /** Check if a (deviceId, seq) pair already exists. */
    fun hasSeq(deviceId: String, seq: Long): Boolean

    /** Get the watermark (last acknowledged sequence number) for sync. */
    fun getWatermark(): Long

    /** Set the watermark (update after successful sync). */
    fun setWatermark(seq: Long)
}