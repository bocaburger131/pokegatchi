package com.shift4funding.tamagotchi.pgp

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * Thread-safe ring buffer for recent notification-enriched results (last 20).
 * Observable via [results] StateFlow for Compose UI.
 *
 * SAFE-POLISH: New file in pgp/. No frozen files modified.
 *
 * Guardrail: No long-term database. Ring buffer only.
 */
class RecentResultsRepository private constructor() {

    companion object {
        private const val TAG = "RecentResultsRepo"
        const val MAX_RESULTS = 20

        @Volatile private var instance: RecentResultsRepository? = null

        fun getInstance(): RecentResultsRepository = instance ?: synchronized(this) {
            instance ?: RecentResultsRepository().also { instance = it }
        }
    }

    private val buffer = ConcurrentLinkedDeque<NotificationEvent>()
    private val _results = MutableStateFlow<List<NotificationEvent>>(emptyList())
    val results: StateFlow<List<NotificationEvent>> = _results.asStateFlow()

    fun add(event: NotificationEvent): NotificationEvent {
        buffer.addLast(event)
        while (buffer.size > MAX_RESULTS) buffer.pollFirst()
        _results.value = buffer.toList()
        Log.d(TAG, "Added: type=${event.parsedType} name=${event.parsedName} (buffer=${buffer.size})")
        return event
    }

    fun getLatest(): NotificationEvent? = buffer.peekLast()
    fun getAll(): List<NotificationEvent> = buffer.toList()
    fun size(): Int = buffer.size
    fun isEmpty(): Boolean = buffer.isEmpty()

    fun clear() {
        buffer.clear()
        _results.value = emptyList()
        Log.d(TAG, "Buffer cleared")
    }
}
