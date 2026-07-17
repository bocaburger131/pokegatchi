package com.shift4funding.tamagotchi.pgp

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Exports recorded canonical events as a JSON file for Pokégatchi replay.
 *
 * Supports:
 *   - Full export (all events)
 *   - Incremental export (since a watermark/sequence)
 *   - Export as shareable file via Android share intent
 *
 * SAFE-POLISH: New file, no BLE core modifications.
 */
class EventLogExporter(
    private val context: Context,
    private val eventRecorder: EventRecorder = EventLogRepository(context)
) {
    companion object {
        private const val TAG = "EventLogExporter"
        private const val EXPORT_FILENAME = "pokegatchi_replay.json"

        /** Export schema metadata included with every export file. */
        const val EXPORT_FORMAT_VERSION = 1
    }

    /**
     * Export all events with metadata envelope.
     * Output format:
     * {
     *   "exportFormatVersion": 1,
     *   "exportedAtMs": <timestamp>,
     *   "deviceId": "<id>",
     *   "eventCount": <N>,
     *   "events": [ ...canonical events... ]
     * }
     */
    fun exportFull(deviceId: String): String {
        val events = eventRecorder.exportAll()
        Log.d(TAG, "Exporting full event log: ${eventRecorder.getEventCount()} events")

        return wrapEnvelope(deviceId, events).toString(2)
    }

    /**
     * Export events since a given sequence number (exclusive).
     */
    fun exportSince(deviceId: String, afterSeq: Long): String {
        val events = eventRecorder.exportSince(afterSeq)
        val count = JSONArray(events).length()
        Log.d(TAG, "Exporting events since seq=$afterSeq: $count events")

        return wrapEnvelope(deviceId, events).toString(2)
    }

    /**
     * Export the delta between the local log and a remote watermark.
     */
    fun exportDelta(deviceId: String, remoteWatermark: Long): ExportDelta {
        val localCount = eventRecorder.getEventCount()
        val localWatermark = eventRecorder.getWatermark()

        val hasNew = localCount > remoteWatermark
        val json = if (hasNew) {
            wrapEnvelope(deviceId, eventRecorder.exportSince(remoteWatermark)).toString(2)
        } else null

        return ExportDelta(
            hasNewData = hasNew,
            localCount = localCount,
            remoteWatermark = remoteWatermark,
            localWatermark = localWatermark,
            json = json
        )
    }

    data class ExportDelta(
        val hasNewData: Boolean,
        val localCount: Long,
        val remoteWatermark: Long,
        val localWatermark: Long,
        val json: String?
    )

    /**
     * Export to a shareable file and return the share intent.
     * Use this for manual export via the watch UI (e.g., share to companion app).
     */
    fun exportShareableFile(deviceId: String): Intent? {
        return try {
            val json = exportFull(deviceId)
            val file = File(context.cacheDir, EXPORT_FILENAME)
            file.writeText(json)

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.pgp.fileprovider",
                file
            )

            Log.d(TAG, "Shareable export written: ${file.absolutePath} (${file.length()} bytes)")

            Intent(Intent.ACTION_SEND).apply {
                type = "application/json"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Pokégatchi Replay Export")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create shareable export: ${e.message}", e)
            null
        }
    }

    // ─── Internal ──────────────────────────────────────────────────

    private fun wrapEnvelope(deviceId: String, eventsJson: String): JSONObject {
        val eventsArray = try {
            JSONArray(eventsJson)
        } catch (e: Exception) {
            JSONArray()
        }

        return JSONObject().apply {
            put("exportFormatVersion", EXPORT_FORMAT_VERSION)
            put("exportedAtMs", System.currentTimeMillis())
            put("deviceId", deviceId)
            put("eventCount", eventsArray.length())
            put("events", eventsArray)
        }
    }
}