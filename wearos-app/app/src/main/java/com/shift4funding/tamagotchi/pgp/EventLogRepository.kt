package com.shift4funding.tamagotchi.pgp

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.withLock

/**
 * Append-only local event log with sequence numbers and schema version.
 *
 * Stores canonical events as JSONL (one JSON object per line) on disk.
 * Uses atomic append + sequence counter in SharedPreferences.
 *
 * SAFE-POLISH: New file, no BLE core modifications.
 *
 * Dedupe protection:
 *   - eventId uniqueness enforced at record time
 *   - (deviceId, seq) uniqueness checked via in-memory cache
 *   - Restart recovery: seq counter survives via SharedPreferences
 */
class EventLogRepository(
    private val context: Context
) : EventRecorder {

    companion object {
        private const val TAG = "EventLogRepository"
        private const val LOG_FILENAME = "pgp_event_log.jsonl"
        private const val PREFS_NAME = "tamagotchi_pgp_log"
        private const val KEY_SEQ = "event_seq"
        private const val KEY_WATERMARK = "sync_watermark"
        private const val MAX_EVENT_ID_CACHE = 10_000
    }

    private val lock = ReentrantReadWriteLock()
    private val logFile: File by lazy {
        File(context.filesDir, LOG_FILENAME).also {
            if (!it.exists()) it.createNewFile()
            Log.d(TAG, "Event log file: ${it.absolutePath} (${it.length()} bytes)")
        }
    }
    private val prefs by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // In-memory dedupe caches — rebuilt on restart by scanning log file
    private val eventIdCache = LinkedHashSet<String>(MAX_EVENT_ID_CACHE)
    private val seqCache = mutableMapOf<String, Long>() // deviceId -> max seq seen

    init {
        rebuildCaches()
    }

    override fun record(event: CanonicalEvent): CanonicalEvent {
        lock.writeLock().withLock {
            // Dedupe: check eventId
            if (eventIdCache.contains(event.eventId)) {
                Log.w(TAG, "Duplicate eventId rejected: ${event.eventId}")
                return event.copy(seq = -1) // signal duplicate
            }

            // Dedupe: check (deviceId, seq) if seq > 0
            if (event.seq > 0) {
                val existing = seqCache[event.deviceId]
                if (existing != null && event.seq <= existing) {
                    Log.w(TAG, "Non-monotonic seq rejected: deviceId=${event.deviceId} seq=${event.seq} <= existing=$existing")
                    return event.copy(seq = -2)
                }
            }

            // Assign next sequence number
            val nextSeq = prefs.getLong(KEY_SEQ, 0) + 1
            val recorded = event.copy(seq = nextSeq)

            // Append to JSONL file (atomic-ish: write line, then flush)
            val line = recorded.toJson().toString()
            logFile.appendText(line + "\n")

            // Persist sequence counter
            prefs.edit().putLong(KEY_SEQ, nextSeq).apply()

            // Update caches
            eventIdCache.add(recorded.eventId)
            seqCache[recorded.deviceId] = nextSeq
            pruneCaches()

            Log.d(TAG, "Recorded event: seq=$nextSeq type=${recorded.eventType} id=${recorded.eventId}")
            return recorded
        }
    }

    override fun getEventCount(): Long {
        lock.readLock().withLock {
            return prefs.getLong(KEY_SEQ, 0)
        }
    }

    override fun getLatestEvent(): CanonicalEvent? {
        lock.readLock().withLock {
            if (!logFile.exists() || logFile.length() == 0L) return null
            // Read last line efficiently by scanning backwards
            val lines = logFile.readLines()
            val lastLine = lines.lastOrNull()?.trim() ?: return null
            if (lastLine.isEmpty()) return null
            return try {
                CanonicalEvent.fromJson(JSONObject(lastLine))
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse latest event: ${e.message}")
                null
            }
        }
    }

    override fun exportAll(): String {
        lock.readLock().withLock {
            if (!logFile.exists() || logFile.length() == 0L) return "[]"
            val array = JSONArray()
            logFile.forEachLine { line ->
                val trimmed = line.trim()
                if (trimmed.isNotEmpty()) {
                    try {
                        array.put(JSONObject(trimmed))
                    } catch (e: Exception) {
                        Log.e(TAG, "Skipping corrupt line in export: ${e.message}")
                    }
                }
            }
            return array.toString(2) // pretty-printed
        }
    }

    override fun exportSince(afterSeq: Long): String {
        lock.readLock().withLock {
            if (!logFile.exists() || logFile.length() == 0L) return "[]"
            val array = JSONArray()
            logFile.forEachLine { line ->
                val trimmed = line.trim()
                if (trimmed.isEmpty()) return@forEachLine
                try {
                    val obj = JSONObject(trimmed)
                    if (obj.optLong("seq", 0) > afterSeq) {
                        array.put(obj)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Skipping corrupt line in exportSince: ${e.message}")
                }
            }
            return array.toString(2)
        }
    }

    override fun hasEvent(eventId: String): Boolean {
        lock.readLock().withLock {
            return eventIdCache.contains(eventId)
        }
    }

    override fun hasSeq(deviceId: String, seq: Long): Boolean {
        lock.readLock().withLock {
            val existing = seqCache[deviceId] ?: return false
            return seq <= existing
        }
    }

    override fun getWatermark(): Long {
        lock.readLock().withLock {
            return prefs.getLong(KEY_WATERMARK, 0)
        }
    }

    override fun setWatermark(seq: Long) {
        lock.writeLock().withLock {
            prefs.edit().putLong(KEY_WATERMARK, seq).apply()
            Log.d(TAG, "Sync watermark set to seq=$seq")
        }
    }

    // ─── Cache management ──────────────────────────────────────────

    private fun rebuildCaches() {
        lock.writeLock().withLock {
            eventIdCache.clear()
            seqCache.clear()
            if (!logFile.exists()) return

            var maxSeq = 0L
            logFile.forEachLine { line ->
                val trimmed = line.trim()
                if (trimmed.isEmpty()) return@forEachLine
                try {
                    val obj = JSONObject(trimmed)
                    val id = obj.optString("eventId", "")
                    val devId = obj.optString("deviceId", "")
                    val seq = obj.optLong("seq", 0)

                    if (id.isNotEmpty()) eventIdCache.add(id)
                    if (devId.isNotEmpty() && seq > 0) {
                        val existing = seqCache[devId] ?: 0
                        if (seq > existing) seqCache[devId] = seq
                    }
                    if (seq > maxSeq) maxSeq = seq
                } catch (e: Exception) {
                    Log.e(TAG, "Skipping corrupt line during cache rebuild: ${e.message}")
                }
            }

            // Restore sequence counter from log (more reliable than SharedPreferences)
            if (maxSeq > 0) {
                val prefsSeq = prefs.getLong(KEY_SEQ, 0)
                if (maxSeq > prefsSeq) {
                    prefs.edit().putLong(KEY_SEQ, maxSeq).apply()
                    Log.w(TAG, "Seq counter recovered: SharedPrefs=$prefsSeq → log=$maxSeq")
                }
            }

            Log.d(TAG, "Cache rebuilt: ${eventIdCache.size} eventIds, ${seqCache.size} devices, maxSeq=$maxSeq")
        }
    }

    private fun pruneCaches() {
        // eventIdCache: keep last MAX_EVENT_ID_CACHE entries (LinkedHashSet preserves insertion order)
        while (eventIdCache.size > MAX_EVENT_ID_CACHE) {
            val iter = eventIdCache.iterator()
            if (iter.hasNext()) { iter.next(); iter.remove() }
        }
        // seqCache stays bounded by number of devices
    }

    /** Clear all recorded events — FOR TESTING AND RESET ONLY. */
    fun reset() {
        lock.writeLock().withLock {
            logFile.delete()
            logFile.createNewFile()
            eventIdCache.clear()
            seqCache.clear()
            prefs.edit()
                .putLong(KEY_SEQ, 0)
                .putLong(KEY_WATERMARK, 0)
                .apply()
            Log.d(TAG, "Event log reset — all events cleared")
        }
    }
}