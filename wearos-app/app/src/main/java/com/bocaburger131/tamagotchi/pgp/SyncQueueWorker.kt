package com.bocaburger131.tamagotchi.pgp

import android.util.Log
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Minimal sync queue / batch-prep layer.
 *
 * Collects events into batches and provides a retry-capable sync worker.
 * Does NOT touch protected BLE service logic — operates only on the event log.
 *
 * SAFE-POLISH: New file, no BLE core modifications.
 *
 * Features:
 *   - In-memory queue for pending sync batches
 *   - Configurable batch size
 *   - Exponential backoff with jitter for retries
 *   - Logging/observability hooks at every stage
 */
class SyncQueueWorker(
    private val eventRecorder: EventRecorder,
    private val batchSize: Int = 50,
    private val maxRetries: Int = 5,
    private val baseBackoffMs: Long = 1_000L,
    /** Provider checked before any sync/export action. Always wire explicitly
     * to PgpConfig.isSyncEnabled(context) — never rely on the default. */
    private val syncEnabled: () -> Boolean = { false }
) {
    companion object {
        private const val TAG = "SyncQueueWorker"
    }

    // Types for sync callbacks and observability
    interface SyncHandler {
        /** Attempt to send a batch. Return true if acknowledged successfully. */
        suspend fun sendBatch(batchId: String, events: List<CanonicalEvent>): Boolean
    }

    interface SyncObserver {
        fun onBatchQueued(batchId: String, count: Int)
        fun onBatchSent(batchId: String, count: Int, attempt: Int)
        fun onBatchAcked(batchId: String, count: Int, attempt: Int)
        fun onBatchFailed(batchId: String, count: Int, attempt: Int, error: String)
    }

    data class PendingBatch(
        val batchId: String,
        val events: List<CanonicalEvent>,
        val firstSeq: Long,
        val lastSeq: Long,
        val attempt: Int = 0
    )

    private val queue = ConcurrentLinkedQueue<PendingBatch>()
    private val isProcessing = AtomicBoolean(false)
    private var handler: SyncHandler? = null
    private var observer: SyncObserver? = null
    private var job: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun setHandler(handler: SyncHandler) { this.handler = handler }
    fun setObserver(observer: SyncObserver) { this.observer = observer }

    /**
     * Prepare a batch from the event log starting after the current watermark.
     * Events are batched by contiguous sequence numbers.
     * Returns null if sync is disabled or no new events are available.
     */
    fun prepareNextBatch(): PendingBatch? {
        if (!syncEnabled()) {
            Log.d(TAG, "Sync disabled — skipping batch preparation")
            return null
        }

        val watermark = eventRecorder.getWatermark()
        val json = eventRecorder.exportSince(watermark)
        val array = org.json.JSONArray(json)

        if (array.length() == 0) return null

        val events = mutableListOf<CanonicalEvent>()
        for (i in 0 until minOf(array.length(), batchSize)) {
            val obj = array.getJSONObject(i)
            events.add(CanonicalEvent.fromJson(obj))
        }

        if (events.isEmpty()) return null

        val firstSeq = events.first().seq
        val lastSeq = events.last().seq
        val batchId = "batch-${firstSeq}-${lastSeq}-${System.currentTimeMillis()}"

        val batch = PendingBatch(
            batchId = batchId,
            events = events,
            firstSeq = firstSeq,
            lastSeq = lastSeq
        )

        queue.add(batch)
        observer?.onBatchQueued(batchId, events.size)
        Log.d(TAG, "Batch queued: $batchId (${events.size} events, seq $firstSeq→$lastSeq)")

        return batch
    }

    /** Enqueue a specific batch (e.g., for retry). */
    fun enqueue(batch: PendingBatch) {
        queue.add(batch)
        observer?.onBatchQueued(batch.batchId, batch.events.size)
    }

    /** Process all pending batches, retrying with exponential backoff.
     * No-ops if sync is disabled. */
    suspend fun processAll() {
        if (!syncEnabled()) {
            Log.d(TAG, "Sync disabled — skipping processAll")
            return
        }
        if (!isProcessing.compareAndSet(false, true)) {
            Log.w(TAG, "Sync already in progress — skipping duplicate processAll()")
            return
        }

        try {
            while (true) {
                val batch = queue.poll() ?: break
                processBatch(batch)
            }
        } finally {
            isProcessing.set(false)
        }
    }

    /** Start a background sync worker that polls for new data and processes it.
     * No-ops if sync is disabled via syncEnabled provider. */
    fun startPeriodicSync(intervalMs: Long = 30_000L) {
        if (!syncEnabled()) {
            Log.d(TAG, "Sync disabled — periodic sync not started")
            return
        }
        if (job?.isActive == true) {
            Log.w(TAG, "Periodic sync already running")
            return
        }
        job = scope.launch {
            Log.d(TAG, "Periodic sync started (interval=${intervalMs}ms)")
            while (isActive) {
                try {
                    val batch = prepareNextBatch()
                    if (batch != null) {
                        processBatch(batch)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Periodic sync error: ${e.message}", e)
                }
                delay(intervalMs)
            }
        }
    }

    /** Stop the periodic sync worker. */
    fun stopPeriodicSync() {
        job?.cancel()
        job = null
        Log.d(TAG, "Periodic sync stopped")
    }

    /** Get the number of pending batches. */
    fun pendingCount(): Int = queue.size

    // ─── Internal ──────────────────────────────────────────────────

    private suspend fun processBatch(batch: PendingBatch) {
        val handler = this.handler
        if (handler == null) {
            Log.w(TAG, "No SyncHandler set — batch ${batch.batchId} deferred")
            queue.add(batch) // re-enqueue for later
            return
        }

        for (attempt in 1..maxRetries) {
            observer?.onBatchSent(batch.batchId, batch.events.size, attempt)
            Log.d(TAG, "Sending batch ${batch.batchId} attempt $attempt/${maxRetries}")

            try {
                val success = handler.sendBatch(batch.batchId, batch.events)
                if (success) {
                    // Ack: advance watermark
                    eventRecorder.setWatermark(batch.lastSeq)
                    observer?.onBatchAcked(batch.batchId, batch.events.size, attempt)
                    Log.d(TAG, "Batch ${batch.batchId} acknowledged — watermark → ${batch.lastSeq}")
                    return
                }
            } catch (e: Exception) {
                Log.e(TAG, "Batch ${batch.batchId} attempt $attempt failed: ${e.message}", e)
                observer?.onBatchFailed(batch.batchId, batch.events.size, attempt, e.message ?: "unknown")
            }

            if (attempt < maxRetries) {
                val delayMs = backoffDelay(attempt)
                Log.d(TAG, "Retrying batch ${batch.batchId} in ${delayMs}ms")
                delay(delayMs)
            }
        }

        // All retries exhausted — log as system event and give up
        Log.e(TAG, "Batch ${batch.batchId} exhausted $maxRetries retries — dropped")
        observer?.onBatchFailed(
            batch.batchId, batch.events.size, maxRetries,
            "exhausted $maxRetries retries"
        )
    }

    private fun backoffDelay(attempt: Int): Long {
        val exponential = baseBackoffMs * (1L shl (attempt - 1))
        val jitter = (Math.random() * exponential * 0.3).toLong()
        return minOf(exponential + jitter, 60_000L) // cap at 60s
    }
}