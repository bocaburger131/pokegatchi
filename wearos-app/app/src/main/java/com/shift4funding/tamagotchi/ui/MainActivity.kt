package com.shift4funding.tamagotchi.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import com.shift4funding.tamagotchi.ble.BleGattServerService
import com.shift4funding.tamagotchi.tamagotchi.*
import com.shift4funding.tamagotchi.ui.components.PgpModeToggle
import com.shift4funding.tamagotchi.ui.components.TriggerAnimationOverlay
import com.shift4funding.tamagotchi.ui.screens.MainScreen
import com.shift4funding.tamagotchi.util.SeedGenerator

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Start the BLE GATT server (auto-catcher)
        Intent(this, BleGattServerService::class.java).also { intent ->
            startForegroundService(intent)
        }

        setContent {
            TamaGoApp()
        }
    }
}

@Composable
fun TamaGoApp() {
    val seed = remember { SeedGenerator.generate() }
    var state by remember { mutableStateOf(createInitialState(seed)) }
    val context = LocalContext.current

    // Trigger animation state — set when a BLE event fires
    var triggerEvent by remember { mutableStateOf<String?>(null) }

    // BLE event receiver — fires when PGP/Go-tcha catches or spins
    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                val eventType = intent.getStringExtra(BleGattServerService.EXTRA_EVENT_TYPE)
                // Fire trigger animation (caught, fled, spun only — skip nearby alerts)
                when (eventType) {
                    BleGattServerService.EVENT_CAUGHT,
                    BleGattServerService.EVENT_FLED,
                    BleGattServerService.EVENT_SPUN -> {
                        triggerEvent = eventType
                    }
                }
                when (eventType) {
                    BleGattServerService.EVENT_CAUGHT ->
                        state = tamagotchiReducer(state, TamagotchiAction.PokemonCaught(isShiny = false))
                    BleGattServerService.EVENT_FLED ->
                        state = tamagotchiReducer(state, TamagotchiAction.PokemonFled)
                    BleGattServerService.EVENT_SPUN ->
                        state = tamagotchiReducer(state, TamagotchiAction.PokeStopSpun)
                }
            }
        }
        val filter = IntentFilter(BleGattServerService.ACTION_BLE_EVENT)
        context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        onDispose { context.unregisterReceiver(receiver) }
    }

    // Tick timer — advances game state every 60 seconds
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(60_000)
            state = tamagotchiReducer(state, TamagotchiAction.Tick)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        MainScreen(
            state = state,
            onAction = { action ->
                state = tamagotchiReducer(state, action)
            }
        )

        // Trigger animation overlay — rendered on top of MainScreen
        TriggerAnimationOverlay(
            eventType = triggerEvent,
            modifier = Modifier.fillMaxSize()
        )

        // PGP mode toggle — top-right corner
        PgpModeToggle(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 8.dp, end = 8.dp)
        )
    }
}

private fun createInitialState(seed: Long): TamagotchiState {
    return TamagotchiState(
        seed = seed,
        ivs = IVs(
            weight = seedStat(seed, 0),
            happiness = seedStat(seed, 1),
            intelligence = seedStat(seed, 2),
            agility = seedStat(seed, 3),
            bond = seedStat(seed, 4),
            discipline = seedStat(seed, 5)
        ),
        personality = Personality(
            lazy = seedFraction(seed, 6),
            affectionate = seedFraction(seed, 7),
            foodie = seedFraction(seed, 8),
            brave = seedFraction(seed, 9)
        ),
        name = "Tama",
        stage = EvolutionStage.EGG,
        eggHatchProgress = 0f
    )
}

private fun seedStat(seed: Long, index: Int): Int {
    return ((seed shr (index * 4)) and 0x1F).toInt().coerceIn(1, 31)
}

private fun seedFraction(seed: Long, index: Int): Float {
    return ((seed shr (index * 3)) and 0x07).toFloat() / 7.0f
}
