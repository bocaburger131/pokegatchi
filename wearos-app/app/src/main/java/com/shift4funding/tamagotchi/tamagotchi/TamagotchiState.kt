package com.shift4funding.tamagotchi.tamagotchi

/**
 * The soul of the pet. This state machine drives everything:
 * mood, hunger, bond, weight, evolution, and idle behavior.
 */

// ─── Evolution Stage ────────────────────────────────────────────────
enum class EvolutionStage(val displayName: String, val catchThreshold: Int) {
    EGG("Egg", 0),
    BABY("Baby", 0),
    TEEN("Teen", 100),
    ADULT("Adult", 500),
    MEGA("Mega", 1000)
}

// ─── Mood ───────────────────────────────────────────────────────────
enum class Mood {
    HAPPY,
    CONTENT,
    HUNGRY,
    SAD,
    EXCITED,
    SLEEPY,
    DIRTY
}

// ─── Personality Traits (seeded at birth) ───────────────────────────
data class Personality(
    val lazy: Float = 0f,           // 0=energetic, 1=lazy — affects training difficulty
    val affectionate: Float = 0f,   // 0=aloof, 1=cuddly — affects bond gain rate
    val foodie: Float = 0f,         // 0=indifferent, 1=hungry — affects hunger decay
    val brave: Float = 0f           // 0=timid, 1=brave — affects flee reaction intensity
)

// ─── Hidden IVs (unique per pet, seeded) ────────────────────────────
data class IVs(
    val weight: Int = 15,       // 1-31
    val happiness: Int = 15,
    val intelligence: Int = 15,
    val agility: Int = 15,
    val bond: Int = 10,
    val discipline: Int = 15
)

// ─── Main State ─────────────────────────────────────────────────────
data class TamagotchiState(
    // Identity
    val name: String = "Tama",
    val seed: Long = System.currentTimeMillis(),
    val ivs: IVs = IVs(),
    val personality: Personality = Personality(),

    // Stage
    val stage: EvolutionStage = EvolutionStage.EGG,
    val totalCatches: Int = 0,
    val totalSpins: Int = 0,

    // Core Stats (0-100)
    val hunger: Int = 80,
    val happiness: Int = 80,
    val bond: Int = 10,
    val weight: Int = 50,
    val energy: Int = 100,

    // Training
    val intelligence: Int = 0,
    val agility: Int = 0,
    val discipline: Int = 0,

    // Mood
    val mood: Mood = Mood.HAPPY,
    val lastFedTime: Long = System.currentTimeMillis(),
    val lastPlayedTime: Long = System.currentTimeMillis(),
    val lastCaughtTime: Long = 0L,

    // Evolution Progress
    val eggHatchProgress: Float = 0f,    // 0-1.0, egg only
    val evolutionProgress: Float = 0f,   // 0-1.0 toward next stage

    // Cosmetics
    val color: Int = 0xFF6C63FF.toInt(),  // default purple
    val equippedHat: String? = null,
    val equippedAccessory: String? = null,
    val unlockedCostumes: List<String> = emptyList(),

    // Auto-catch Stats
    val autoCatchEnabled: Boolean = true,
    val autoSpinEnabled: Boolean = true,
    val consecutiveCatches: Int = 0,
    val streakDays: Int = 0,
    val cleanliness: Int = 100,       // 0-100, decays over time
    val level: Int = 1,               // permanent rank, earned via XP
    val xp: Int = 0,                  // XP toward next level
    val lastBathTime: Long = System.currentTimeMillis(),
)

// ─── Actions ────────────────────────────────────────────────────────
sealed class TamagotchiAction {
    data object Tick : TamagotchiAction()                  // called every 60s
    data class Feed(val berryType: String) : TamagotchiAction()
    data object Pet : TamagotchiAction()
    data object Play : TamagotchiAction()
    data class PokemonCaught(val isShiny: Boolean = false) : TamagotchiAction()
    data object PokemonFled : TamagotchiAction()
    data object PokeStopSpun : TamagotchiAction()
    data class TrainMiniGame(val result: MiniGameResult) : TamagotchiAction()
    data object Bath : TamagotchiAction()
}

data class MiniGameResult(
    val score: Int,
    val stat: StatType,
    val perfect: Boolean = false
)

enum class StatType { HAPPINESS, INTELLIGENCE, AGILITY, DISCIPLINE, BOND, WEIGHT }

// ─── Reducer ────────────────────────────────────────────────────────
fun tamagotchiReducer(state: TamagotchiState, action: TamagotchiAction): TamagotchiState {
    return when (action) {
        is TamagotchiAction.Tick -> handleTick(state)
        is TamagotchiAction.Feed -> handleFeed(state, action.berryType)
        is TamagotchiAction.Pet -> handlePet(state)
        is TamagotchiAction.Play -> handlePlay(state)
        is TamagotchiAction.PokemonCaught -> handleCatch(state, action.isShiny)
        is TamagotchiAction.PokemonFled -> handleFlee(state)
        is TamagotchiAction.PokeStopSpun -> handleSpin(state)
        is TamagotchiAction.TrainMiniGame -> handleTrain(state, action.result)
        is TamagotchiAction.Bath -> handleBath(state)
    }
}

// ─── State Machine Logic ────────────────────────────────────────────

private fun handleTick(state: TamagotchiState): TamagotchiState {
    val now = System.currentTimeMillis()
    val hoursSinceLastFed = (now - state.lastFedTime) / 3600000f
    val hoursSinceLastPlay = (now - state.lastPlayedTime) / 3600000f

    val hungerDecay = (hoursSinceLastFed * 5).toInt().coerceIn(0, 40)
    val happinessDecay = if (hoursSinceLastPlay > 4) (hoursSinceLastPlay * 3).toInt().coerceIn(0, 30) else 0
    val energyGain = if (hoursSinceLastFed < 2) 5 else 0

    val newHunger = (state.hunger - hungerDecay).coerceIn(0, 100)
    val newHappiness = (state.happiness - happinessDecay).coerceIn(0, 100)
    val newEnergy = (state.energy + energyGain).coerceIn(0, 100)

    // Cleanliness decays ~10 points per hour
    val hoursSinceLastBath = (now - state.lastBathTime) / 3600000f
    val cleanlinessDecay = (hoursSinceLastBath * 0.17f).toInt().coerceIn(0, 50)
    val newCleanliness = (state.cleanliness - cleanlinessDecay).coerceIn(0, 100)

    // Egg hatching
    val newEggProgress = if (state.stage == EvolutionStage.EGG) {
        (state.eggHatchProgress + 0.05f).coerceAtMost(1.0f)
    } else state.eggHatchProgress

    val canHatch = state.stage == EvolutionStage.EGG && newEggProgress >= 1.0f
    val newStage = if (canHatch) EvolutionStage.BABY else state.stage

    // Derive mood
    val newMood = when {
        newCleanliness < 20 -> Mood.DIRTY
        newHunger < 20 -> Mood.HUNGRY
        newHappiness < 20 -> Mood.SAD
        newEnergy < 20 -> Mood.SLEEPY
        newHappiness > 80 && newHunger > 70 -> Mood.EXCITED
        newHappiness > 60 -> Mood.HAPPY
        else -> Mood.CONTENT
    }

    return state.copy(
        hunger = newHunger,
        happiness = newHappiness,
        energy = (state.energy + energyGain).coerceIn(0, 100),
        mood = newMood,
        eggHatchProgress = newEggProgress,
        stage = newStage,
        cleanliness = newCleanliness,
    )
}

private fun handleFeed(state: TamagotchiState, berryType: String): TamagotchiState {
    val base = state.copy(
        hunger = (state.hunger + 25).coerceAtMost(100),
        happiness = (state.happiness + 5).coerceAtMost(100),
        weight = (state.weight + 2).coerceAtMost(100),
        lastFedTime = System.currentTimeMillis()
    )
    // Foodie personality gains weight faster
    return if (state.personality.foodie > 0.5f) {
        base.copy(weight = (base.weight + 1).coerceAtMost(100))
    } else base
}

private fun handlePet(state: TamagotchiState): TamagotchiState {
    val bondGain = if (state.personality.affectionate > 0.5f) 3 else 2
    return state.copy(
        happiness = (state.happiness + 5).coerceAtMost(100),
        bond = (state.bond + bondGain).coerceAtMost(100)
    )
}

private fun handlePlay(state: TamagotchiState): TamagotchiState {
    return state.copy(
        happiness = (state.happiness + 10).coerceAtMost(100),
        energy = (state.energy - 10).coerceAtLeast(0),
        lastPlayedTime = System.currentTimeMillis()
    )
}

private fun handleCatch(state: TamagotchiState, isShiny: Boolean): TamagotchiState {
    val newTotal = state.totalCatches + 1
    val progress = calcEvolutionProgress(newTotal, state.stage)
    val evolvedStage = checkEvolution(newTotal, state.stage)

    val xpGain = if (isShiny) 15 else 5
    val newXp = state.xp + xpGain
    val xpNeeded = state.level * 100  // each level needs level*100 XP
    val didLevelUp = newXp >= xpNeeded
    val finalXp = if (didLevelUp) newXp - xpNeeded else newXp
    val newLevel = if (didLevelUp) state.level + 1 else state.level

    return state.copy(
        totalCatches = newTotal,
        happiness = (state.happiness + 8).coerceAtMost(100),
        bond = (state.bond + 1).coerceAtMost(100),
        consecutiveCatches = state.consecutiveCatches + 1,
        evolutionProgress = progress,
        stage = evolvedStage,
        mood = if (isShiny) Mood.EXCITED else Mood.HAPPY,
        lastCaughtTime = System.currentTimeMillis(),
        level = newLevel,
        xp = finalXp,
    )
}

private fun handleFlee(state: TamagotchiState): TamagotchiState {
    val happinessLoss = if (state.personality.brave > 0.5f) 5 else 15
    return state.copy(
        happiness = (state.happiness - happinessLoss).coerceAtLeast(0),
        consecutiveCatches = 0,
        mood = Mood.SAD
    )
}

private fun handleSpin(state: TamagotchiState): TamagotchiState {
    val newXp = state.xp + 2
    val xpNeeded = state.level * 100
    val didLevelUp = newXp >= xpNeeded
    val finalXp = if (didLevelUp) newXp - xpNeeded else newXp
    val newLevel = if (didLevelUp) state.level + 1 else state.level

    return state.copy(
        totalSpins = state.totalSpins + 1,
        hunger = (state.hunger + 3).coerceAtMost(100),
        level = newLevel,
        xp = finalXp,
    )
}

private fun handleTrain(state: TamagotchiState, result: MiniGameResult): TamagotchiState {
    val lazyPenalty = (state.personality.lazy * 2).toInt()
    val gain = (result.score / 10 - lazyPenalty).coerceAtLeast(1)

    return when (result.stat) {
        StatType.HAPPINESS -> state.copy(happiness = (state.happiness + gain).coerceAtMost(100))
        StatType.INTELLIGENCE -> state.copy(intelligence = state.intelligence + gain)
        StatType.AGILITY -> state.copy(agility = state.agility + gain)
        StatType.DISCIPLINE -> state.copy(discipline = state.discipline + gain)
        StatType.BOND -> state.copy(bond = (state.bond + gain).coerceAtMost(100))
        StatType.WEIGHT -> state.copy(weight = (state.weight - gain).coerceAtLeast(1).coerceAtMost(100))
    }
}

private fun handleBath(state: TamagotchiState): TamagotchiState {
    return state.copy(
        cleanliness = 100,
        happiness = (state.happiness + 5).coerceAtMost(100),
        lastBathTime = System.currentTimeMillis(),
        mood = if (state.mood == Mood.DIRTY) Mood.HAPPY else state.mood
    )
}

private fun calcEvolutionProgress(catches: Int, stage: EvolutionStage): Float {
    val nextThreshold = when (stage) {
        EvolutionStage.EGG -> 1    // hatch after interaction
        EvolutionStage.BABY -> EvolutionStage.TEEN.catchThreshold
        EvolutionStage.TEEN -> EvolutionStage.ADULT.catchThreshold
        EvolutionStage.ADULT -> EvolutionStage.MEGA.catchThreshold
        EvolutionStage.MEGA -> Int.MAX_VALUE
    }
    if (nextThreshold == Int.MAX_VALUE) return 1.0f
    return (catches.toFloat() / nextThreshold).coerceAtMost(1.0f)
}

private fun checkEvolution(catches: Int, currentStage: EvolutionStage): EvolutionStage {
    return when {
        catches >= EvolutionStage.MEGA.catchThreshold && currentStage == EvolutionStage.ADULT -> EvolutionStage.MEGA
        catches >= EvolutionStage.ADULT.catchThreshold && currentStage == EvolutionStage.TEEN -> EvolutionStage.ADULT
        catches >= EvolutionStage.TEEN.catchThreshold && currentStage == EvolutionStage.BABY -> EvolutionStage.TEEN
        else -> currentStage
    }
}
