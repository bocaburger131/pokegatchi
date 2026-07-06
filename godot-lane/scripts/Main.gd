extends Control

const TEAM_COLORS := {
	"valor": Color(1.0, 0.27, 0.27, 1.0),
	"mystic": Color(0.27, 0.53, 1.0, 1.0),
	"instinct": Color(1.0, 0.84, 0.0, 1.0),
}

const TEAM_DIM_BG := {
	"valor": Color(0.10, 0.05, 0.05, 1.0),
	"mystic": Color(0.05, 0.06, 0.12, 1.0),
	"instinct": Color(0.12, 0.11, 0.04, 1.0),
}

const PETS := [
	{"name": "Eevee", "texture": preload("res://assets/sprites/eevee_skin_v2_compact.png")},
	{"name": "Psyduck", "texture": preload("res://assets/sprites/psyduck_skin_v1.png")}
]

const ACTION_STATE := {
	"idle": "State: Idle",
	"feed": "State: Eating 🍓",
	"pet": "State: Loved ✨",
	"heal": "State: Recovering 💖",
	"catch": "State: Catch Celebration 🎉",
	"spin": "State: Spinning Stop 🌀"
}

@onready var bg: ColorRect = $Background
@onready var accent_bar: ColorRect = $AccentBar
@onready var title_label: Label = $Title
@onready var team_badge: Button = $TeamBadge
@onready var team_overlay: Control = $TeamOverlay

@onready var play_button: Button = $ModeBar/PlayButton
@onready var auto_button: Button = $ModeBar/AutoButton
@onready var scene_button: Button = $ModeBar/SceneButton
@onready var status_label: Label = $Status

@onready var bag_button: Button = $HudTabs/BagButton
@onready var pokedex_button: Button = $HudTabs/PokedexButton
@onready var journal_button: Button = $HudTabs/JournalButton
@onready var bag_panel: PanelContainer = $HudPanels/BagPanel
@onready var pokedex_panel: PanelContainer = $HudPanels/PokedexPanel
@onready var journal_panel: PanelContainer = $HudPanels/JournalPanel
@onready var bag_text: Label = $HudPanels/BagPanel/BagVBox/BagText
@onready var pokedex_list: ItemList = $HudPanels/PokedexPanel/PokedexVBox/PokedexList
@onready var journal_log: RichTextLabel = $HudPanels/JournalPanel/JournalVBox/JournalLog

@onready var valor_button: Button = $TeamOverlay/TeamButtons/ValorButton
@onready var mystic_button: Button = $TeamOverlay/TeamButtons/MysticButton
@onready var instinct_button: Button = $TeamOverlay/TeamButtons/InstinctButton
@onready var close_overlay_button: Button = $TeamOverlay/CloseOverlayButton

@onready var pet_name_label: Label = $PetPanel/VBox/PetName
@onready var pet_mood_label: Label = $PetPanel/VBox/PetMood
@onready var action_state_label: Label = $PetPanel/VBox/ActionState
@onready var pet_sprite: TextureRect = $PetPanel/VBox/PetSprite
@onready var hunger_bar: ProgressBar = $PetPanel/VBox/Stats/HungerBar
@onready var happiness_bar: ProgressBar = $PetPanel/VBox/Stats/HappyBar
@onready var energy_bar: ProgressBar = $PetPanel/VBox/Stats/EnergyBar

@onready var feed_button: Button = $PetPanel/VBox/Actions/FeedButton
@onready var pet_button: Button = $PetPanel/VBox/Actions/PetButton
@onready var heal_button: Button = $PetPanel/VBox/Actions/HealButton
@onready var catch_button: Button = $PetPanel/VBox/Actions/CatchButton
@onready var spin_button: Button = $PetPanel/VBox/Actions/SpinButton
@onready var swap_pet_button: Button = $PetPanel/VBox/SwapPetButton

var current_mode := "Play"
var current_team := ""
var pet_index := 0
var active_panel := ""
var action_timer := 0.0

var ble_bridge := preload("res://scripts/ble/BleEventBridge.gd").new()

func _ready() -> void:
	# team + mode
	play_button.pressed.connect(func(): _set_mode("Play"))
	auto_button.pressed.connect(func(): _set_mode("Auto"))
	scene_button.pressed.connect(func(): _set_mode("Scene"))
	team_badge.pressed.connect(_on_team_badge_pressed)

	valor_button.pressed.connect(func(): _select_team("valor"))
	mystic_button.pressed.connect(func(): _select_team("mystic"))
	instinct_button.pressed.connect(func(): _select_team("instinct"))
	close_overlay_button.pressed.connect(_on_close_overlay_pressed)

	# Task 4 HUD panels
	bag_button.pressed.connect(func(): _toggle_panel("bag"))
	pokedex_button.pressed.connect(func(): _toggle_panel("pokedex"))
	journal_button.pressed.connect(func(): _toggle_panel("journal"))

	# pet actions
	feed_button.pressed.connect(_on_feed_pressed)
	pet_button.pressed.connect(_on_pet_pressed)
	heal_button.pressed.connect(_on_heal_pressed)
	catch_button.pressed.connect(_on_catch_pressed)
	spin_button.pressed.connect(_on_spin_pressed)
	swap_pet_button.pressed.connect(_swap_pet)

	# Task 5 BLE hook
	ble_bridge.event_received.connect(_on_ble_event)

	if Engine.has_singleton("GameState"):
		current_team = GameState.current_team
		current_mode = GameState.current_mode

	if current_team == "":
		team_overlay.visible = true
		_apply_team_visuals("mystic")
		team_badge.text = "Team: Select one"
	else:
		team_overlay.visible = false
		_apply_team_visuals(current_team)
		team_badge.text = "Team: %s" % _pretty_team(current_team)

	_set_mode(current_mode)
	_refresh_pet_visual()
	_refresh_stats_ui()
	_refresh_hud_panels()
	_set_action_state("idle")

func _process(delta: float) -> void:
	if Engine.has_singleton("GameState"):
		# tiny idle loop so sample feels alive
		var hunger := GameState.hunger - int(2.0 * delta)
		var happiness := GameState.happiness - int(1.0 * delta)
		var energy := GameState.energy - int(1.0 * delta)
		GameState.set_stats(hunger, happiness, energy)
		_refresh_stats_ui()
		_update_mood_text()

	if action_timer > 0.0:
		action_timer -= delta
		if action_timer <= 0.0:
			_set_action_state("idle")

func _select_team(team: String) -> void:
	current_team = team
	team_overlay.visible = false
	team_badge.text = "Team: %s" % _pretty_team(team)
	_apply_team_visuals(team)
	if Engine.has_singleton("GameState"):
		GameState.set_team(team)
		GameState.add_journal_entry("Switched team to %s" % _pretty_team(team))
		_refresh_journal_panel()

func _set_mode(mode: String) -> void:
	current_mode = mode
	status_label.text = "Mode: %s · Pet: %s" % [mode, PETS[pet_index]["name"]]
	play_button.disabled = mode == "Play"
	auto_button.disabled = mode == "Auto"
	scene_button.disabled = mode == "Scene"
	if Engine.has_singleton("GameState"):
		GameState.set_mode(mode)

func _apply_team_visuals(team: String) -> void:
	var accent := TEAM_COLORS.get(team, Color(0.42, 0.39, 1.0, 1.0))
	var bg_color := TEAM_DIM_BG.get(team, Color(0.08, 0.08, 0.12, 1.0))
	bg.color = bg_color
	accent_bar.color = Color(accent.r, accent.g, accent.b, 0.35)
	title_label.text = "Pokegatchi — Godot Sample (%s)" % _pretty_team(team)

func _pretty_team(team: String) -> String:
	match team:
		"valor":
			return "Valor"
		"mystic":
			return "Mystic"
		"instinct":
			return "Instinct"
		_:
			return "Unknown"

func _refresh_pet_visual() -> void:
	var pet: Dictionary = PETS[pet_index]
	pet_name_label.text = "Buddy: %s" % pet["name"]
	pet_sprite.texture = pet["texture"]
	status_label.text = "Mode: %s · Pet: %s" % [current_mode, pet["name"]]
	if Engine.has_singleton("GameState"):
		GameState.register_species(pet["name"])
		_refresh_pokedex_panel()

func _refresh_stats_ui() -> void:
	if not Engine.has_singleton("GameState"):
		return
	hunger_bar.value = GameState.hunger
	happiness_bar.value = GameState.happiness
	energy_bar.value = GameState.energy

func _update_mood_text() -> void:
	if not Engine.has_singleton("GameState"):
		return
	if GameState.hunger < 25:
		pet_mood_label.text = "Mood: Hungry"
	elif GameState.energy < 25:
		pet_mood_label.text = "Mood: Sleepy"
	elif GameState.happiness > 80:
		pet_mood_label.text = "Mood: Excited"
	elif GameState.happiness < 35:
		pet_mood_label.text = "Mood: Sad"
	else:
		pet_mood_label.text = "Mood: Content"

func _on_feed_pressed() -> void:
	if not Engine.has_singleton("GameState"):
		return
	GameState.set_stats(GameState.hunger + 18, GameState.happiness + 6, GameState.energy + 4)
	GameState.add_journal_entry("Fed buddy")
	_refresh_stats_ui()
	_refresh_journal_panel()
	_set_action_state("feed")

func _on_pet_pressed() -> void:
	if not Engine.has_singleton("GameState"):
		return
	GameState.set_stats(GameState.hunger + 2, GameState.happiness + 14, GameState.energy - 3)
	GameState.add_journal_entry("Petted buddy")
	_refresh_stats_ui()
	_refresh_journal_panel()
	_set_action_state("pet")

func _on_heal_pressed() -> void:
	if not Engine.has_singleton("GameState"):
		return
	GameState.set_stats(GameState.hunger + 2, GameState.happiness + 4, GameState.energy + 20)
	GameState.add_journal_entry("Healed buddy")
	_refresh_stats_ui()
	_refresh_journal_panel()
	_set_action_state("heal")

func _on_catch_pressed() -> void:
	ble_bridge.simulate_catch("ui")

func _on_spin_pressed() -> void:
	ble_bridge.simulate_spin("ui")

func _on_ble_event(event_type: String, _payload: Dictionary) -> void:
	if not Engine.has_singleton("GameState"):
		return
	if event_type == "catch":
		GameState.set_stats(GameState.hunger - 2, GameState.happiness + 8, GameState.energy - 3)
		GameState.add_item("Poké Ball", -1)
		GameState.add_item("Candy", 1)
		GameState.add_journal_entry("BLE catch event received")
		_set_action_state("catch")
	elif event_type == "spin":
		GameState.set_stats(GameState.hunger - 1, GameState.happiness + 5, GameState.energy - 2)
		GameState.add_item("Poké Ball", 1)
		GameState.add_item("Berry", 1)
		GameState.add_journal_entry("BLE spin event received")
		_set_action_state("spin")

	_refresh_stats_ui()
	_refresh_hud_panels()
	_update_mood_text()

func _swap_pet() -> void:
	pet_index = (pet_index + 1) % PETS.size()
	_refresh_pet_visual()
	if Engine.has_singleton("GameState"):
		GameState.add_journal_entry("Swapped buddy to %s" % PETS[pet_index]["name"])
		_refresh_journal_panel()

func _set_action_state(key: String) -> void:
	action_state_label.text = ACTION_STATE.get(key, ACTION_STATE["idle"])
	if key != "idle":
		action_timer = 1.2

func _toggle_panel(name: String) -> void:
	if active_panel == name:
		active_panel = ""
	else:
		active_panel = name
	_refresh_hud_panels()

func _refresh_hud_panels() -> void:
	_refresh_bag_panel()
	_refresh_pokedex_panel()
	_refresh_journal_panel()
	bag_panel.visible = active_panel == "bag"
	pokedex_panel.visible = active_panel == "pokedex"
	journal_panel.visible = active_panel == "journal"

func _refresh_bag_panel() -> void:
	if not Engine.has_singleton("GameState"):
		return
	var lines: Array[String] = []
	for key in GameState.bag_items.keys():
		lines.append("%s × %s" % [str(key), str(GameState.bag_items[key])])
	lines.sort()
	bag_text.text = "\n".join(lines)

func _refresh_pokedex_panel() -> void:
	if not Engine.has_singleton("GameState"):
		return
	pokedex_list.clear()
	for name in GameState.pokedex_seen:
		pokedex_list.add_item(str(name))

func _refresh_journal_panel() -> void:
	if not Engine.has_singleton("GameState"):
		return
	journal_log.clear()
	for entry in GameState.journal_entries:
		journal_log.append_text("• %s\n" % str(entry))

func _on_team_badge_pressed() -> void:
	team_overlay.visible = true

func _on_close_overlay_pressed() -> void:
	team_overlay.visible = false
