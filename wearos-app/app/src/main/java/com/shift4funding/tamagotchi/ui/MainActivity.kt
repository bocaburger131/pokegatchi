package com.shift4funding.tamagotchi.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.shift4funding.tamagotchi.ble.BleGattServerService
import com.shift4funding.tamagotchi.tamagotchi.*
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

    // BLE event receiver — fires when PGP/Go-tcha catches or spins
    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                val eventType = intent.getStringExtra(BleGattServerService.EXTRA_EVENT_TYPE)
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

    MainScreen(
        state = state,
        onAction = { action ->
            state = tamagotchiReducer(state, action)
        }
    )
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
