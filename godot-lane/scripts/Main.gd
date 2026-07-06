extends Control

const TEAM_META := {
	"valor": {
		"label": "Valor",
		"badge": "🔴",
		"bg": Color(0.16, 0.08, 0.08, 1.0),
		"accent": Color(1.0, 0.28, 0.28, 1.0)
	},
	"mystic": {
		"label": "Mystic",
		"badge": "🔵",
		"bg": Color(0.08, 0.09, 0.17, 1.0),
		"accent": Color(0.33, 0.56, 1.0, 1.0)
	},
	"instinct": {
		"label": "Instinct",
		"badge": "🟡",
		"bg": Color(0.17, 0.16, 0.08, 1.0),
		"accent": Color(1.0, 0.84, 0.0, 1.0)
	}
}

const PETS := [
	{"name": "Eevee", "texture": preload("res://assets/sprites/eevee_skin_v2_compact.png")},
	{"name": "Psyduck", "texture": preload("res://assets/sprites/psyduck_skin_v1.png")}
]

const WATCH_BREAKPOINT := 540.0
const ROUND_ASPECT_TOLERANCE := 0.16

@onready var background: ColorRect = $Background
@onready var accent_bar: ColorRect = $AccentBar
@onready var title_label: Label = $Title
@onready var team_badge: Button = $TeamBadge
@onready var status_label: Label = $Status

@onready var play_button: Button = $ModeBar/PlayButton
@onready var auto_button: Button = $ModeBar/AutoButton
@onready var scene_button: Button = $ModeBar/SceneButton
@onready var shape_button: Button = $ModeBar/ShapeButton
@onready var ble_mode_button: Button = $ModeBar/BleModeButton

@onready var bag_button: Button = $HudTabs/BagButton
@onready var pokedex_button: Button = $HudTabs/PokedexButton
@onready var journal_button: Button = $HudTabs/JournalButton

@onready var pet_name: Label = $PetPanel/VBox/PetName
@onready var pet_mood: Label = $PetPanel/VBox/PetMood
@onready var action_state: Label = $PetPanel/VBox/ActionState
@onready var pet_texture: TextureRect = $PetPanel/VBox/PetSprite
@onready var hunger_bar: ProgressBar = $PetPanel/VBox/Stats/HungerBar
@onready var happiness_bar: ProgressBar = $PetPanel/VBox/Stats/HappyBar
@onready var energy_bar: ProgressBar = $PetPanel/VBox/Stats/EnergyBar

@onready var feed_button: Button = $PetPanel/VBox/Actions/FeedButton
@onready var pet_button: Button = $PetPanel/VBox/Actions/PetButton
@onready var heal_button: Button = $PetPanel/VBox/Actions/HealButton
@onready var catch_button: Button = $PetPanel/VBox/Actions/CatchButton
@onready var spin_button: Button = $PetPanel/VBox/Actions/SpinButton
@onready var swap_pet_button: Button = $PetPanel/VBox/SwapPetButton

@onready var bag_panel: PanelContainer = $HudPanels/BagPanel
@onready var pokedex_panel: PanelContainer = $HudPanels/PokedexPanel
@onready var journal_panel: PanelContainer = $HudPanels/JournalPanel
@onready var bag_text: Label = $HudPanels/BagPanel/BagVBox/BagText
@onready var pokedex_list: ItemList = $HudPanels/PokedexPanel/PokedexVBox/PokedexList
@onready var journal_log: RichTextLabel = $HudPanels/JournalPanel/JournalVBox/JournalLog

@onready var team_overlay: Control = $TeamOverlay
@onready var overlay_subtitle: Label = $TeamOverlay/OverlaySubtitle
@onready var valor_button: Button = $TeamOverlay/TeamButtons/ValorButton
@onready var mystic_button: Button = $TeamOverlay/TeamButtons/MysticButton
@onready var instinct_button: Button = $TeamOverlay/TeamButtons/InstinctButton
@onready var close_overlay_button: Button = $TeamOverlay/CloseOverlayButton

var current_mode := "Play"
var current_team := "mystic"
var layout_shape_mode := "auto"
var expression_state := "Neutral"
var hunger := 72.0
var happiness := 80.0
var energy := 66.0
var pet_index := 0
var current_action := "idle"
var active_panel := "bag"
var journal_entries: Array[String] = []
var ble_provider_mode := "mock"
var ble_bridge: BleEventBridge

func _ready() -> void:
	# Team controls
	team_badge.pressed.connect(func(): team_overlay.visible = true)
	close_overlay_button.pressed.connect(func(): team_overlay.visible = false)
	valor_button.pressed.connect(func(): _select_team("valor"))
	mystic_button.pressed.connect(func(): _select_team("mystic"))
	instinct_button.pressed.connect(func(): _select_team("instinct"))

	# Mode controls
	play_button.pressed.connect(func(): _set_mode("Play"))
	auto_button.pressed.connect(func(): _set_mode("Auto"))
	scene_button.pressed.connect(func(): _set_mode("Scene"))
	shape_button.pressed.connect(_cycle_shape_mode)
	ble_mode_button.pressed.connect(_toggle_ble_transport)

	# HUD tabs (Task 4)
	bag_button.pressed.connect(func(): _show_panel("bag"))
	pokedex_button.pressed.connect(func(): _show_panel("pokedex"))
	journal_button.pressed.connect(func(): _show_panel("journal"))

	# Pet actions
	feed_button.pressed.connect(_feed)
	pet_button.pressed.connect(_pet)
	heal_button.pressed.connect(_heal)
	catch_button.pressed.connect(_catch)
	spin_button.pressed.connect(_spin)
	swap_pet_button.pressed.connect(_swap_pet)

	# Task 5 BLE bridge simulation hooks
	ble_bridge = BleEventBridge.new()
	ble_bridge.event_received.connect(_on_ble_event_received)
	ble_bridge.transport_status_changed.connect(_on_ble_transport_status)

	if Engine.has_singleton("GameState"):
		current_team = GameState.get_team()
		current_mode = GameState.current_mode
		layout_shape_mode = GameState.layout_shape_mode
		hunger = float(GameState.hunger)
		happiness = float(GameState.happiness)
		energy = float(GameState.energy)

	_apply_team(current_team)
	_set_mode(current_mode)
	_apply_pet()
	_populate_pokedex()
	_show_panel("bag")
	_update_stats_ui()
	_update_mood_text()
	_update_bag_text()
	_update_journal_text()
	_apply_watch_layout()
	_update_shape_button_text()
	_update_ble_mode_button_text()

	# runtime responsive pass
	resized.connect(_on_resized)

	team_overlay.visible = current_team == ""

func _process(delta: float) -> void:
	ble_bridge.poll()

	# lightweight idle decay + Auto mode bonus
	hunger = clamp(hunger - 2.2 * delta, 0.0, 100.0)
	energy = clamp(energy - 1.5 * delta, 0.0, 100.0)
	if current_mode == "Auto":
		happiness = clamp(happiness + 0.4 * delta, 0.0, 100.0)
	else:
		happiness = clamp(happiness - 0.45 * delta, 0.0, 100.0)

	if Engine.has_singleton("GameState"):
		GameState.set_stats(int(hunger), int(happiness), int(energy))

	_update_stats_ui()
	_update_mood_text()

func _select_team(team: String) -> void:
	current_team = team
	if Engine.has_singleton("GameState"):
		GameState.set_team(team)
	_apply_team(team)
	team_overlay.visible = false
	_log_event("Team set to %s" % _pretty_team(team))

func _apply_team(team: String) -> void:
	var meta: Dictionary = TEAM_META.get(team, TEAM_META["mystic"])
	background.color = meta["bg"]
	accent_bar.color = Color(meta["accent"].r, meta["accent"].g, meta["accent"].b, 0.65)
	team_badge.text = "%s %s" % [meta["badge"], meta["label"]]
	title_label.text = "Pokegatchi — Godot Sample (%s)" % meta["label"]
	overlay_subtitle.text = "Team colors theme the whole scene (%s)" % meta["label"]
	valor_button.disabled = team == "valor"
	mystic_button.disabled = team == "mystic"
	instinct_button.disabled = team == "instinct"
	_update_status_text()

func _set_mode(mode: String) -> void:
	current_mode = mode
	if Engine.has_singleton("GameState"):
		GameState.set_mode(mode)
	play_button.disabled = mode == "Play"
	auto_button.disabled = mode == "Auto"
	scene_button.disabled = mode == "Scene"
	_update_status_text()

func _cycle_shape_mode() -> void:
	if layout_shape_mode == "auto":
		layout_shape_mode = "round"
	elif layout_shape_mode == "round":
		layout_shape_mode = "rect"
	else:
		layout_shape_mode = "auto"

	if Engine.has_singleton("GameState"):
		GameState.set_layout_shape_mode(layout_shape_mode)

	_apply_watch_layout()
	_update_shape_button_text()
	_log_event("Layout shape mode: %s" % layout_shape_mode.to_upper())

func _toggle_ble_transport() -> void:
	var mode := ble_bridge.toggle_transport_mode()
	_update_ble_mode_button_text()
	_log_event("BLE transport: %s" % mode.to_upper())

func _show_panel(panel_name: String) -> void:
	active_panel = panel_name
	bag_panel.visible = panel_name == "bag"
	pokedex_panel.visible = panel_name == "pokedex"
	journal_panel.visible = panel_name == "journal"
	bag_button.disabled = panel_name == "bag"
	pokedex_button.disabled = panel_name == "pokedex"
	journal_button.disabled = panel_name == "journal"

func _populate_pokedex() -> void:
	pokedex_list.clear()
	pokedex_list.add_item("#133 Eevee — Normal")
	pokedex_list.add_item("#054 Psyduck — Water")
	pokedex_list.add_item("#025 Pikachu — Electric (target roster)")

func _update_status_text() -> void:
	status_label.text = "Mode: %s · Team: %s · Action: %s" % [current_mode, _pretty_team(current_team), current_action]

func _update_stats_ui() -> void:
	hunger_bar.value = hunger
	happiness_bar.value = happiness
	energy_bar.value = energy

func _update_mood_text() -> void:
	var expression := "Neutral"
	if hunger < 25.0:
		expression = "Hungry"
	elif energy < 20.0:
		expression = "Sleepy"
	elif happiness > 82.0:
		expression = "Excited"
	elif happiness < 35.0:
		expression = "Sad"
	elif current_action in ["catch", "spin"]:
		expression = "Determined"

	expression_state = expression
	pet_mood.text = "Mood: %s" % expression
	action_state.text = "State: %s" % current_action.capitalize()
	_apply_expression_visuals()

func _apply_pet() -> void:
	var pet: Dictionary = PETS[pet_index]
	pet_name.text = "Buddy: %s" % pet["name"]
	pet_texture.texture = pet["texture"]

func _feed() -> void:
	current_action = "feed"
	hunger = clamp(hunger + 24.0, 0.0, 100.0)
	happiness = clamp(happiness + 5.0, 0.0, 100.0)
	energy = clamp(energy + 2.0, 0.0, 100.0)
	_log_event("Fed %s" % PETS[pet_index]["name"])
	_update_status_text()

func _pet() -> void:
	current_action = "pet"
	happiness = clamp(happiness + 12.0, 0.0, 100.0)
	energy = clamp(energy - 2.0, 0.0, 100.0)
	_log_event("Petted %s" % PETS[pet_index]["name"])
	_update_status_text()

func _heal() -> void:
	current_action = "heal"
	energy = clamp(energy + 20.0, 0.0, 100.0)
	happiness = clamp(happiness + 3.0, 0.0, 100.0)
	_log_event("Healed %s" % PETS[pet_index]["name"])
	_update_status_text()

func _catch() -> void:
	current_action = "catch"
	ble_bridge.simulate_catch("sample")

func _spin() -> void:
	current_action = "spin"
	ble_bridge.simulate_spin("sample")

func _on_ble_event_received(event_type: String, payload: Dictionary) -> void:
	if event_type == "catch":
		happiness = clamp(happiness + 8.0, 0.0, 100.0)
		energy = clamp(energy - 4.0, 0.0, 100.0)
		_log_event("BLE catch event (%s)" % payload.get("source", "unknown"))
	elif event_type == "spin":
		happiness = clamp(happiness + 5.0, 0.0, 100.0)
		energy = clamp(energy - 2.0, 0.0, 100.0)
		_log_event("BLE spin event (%s)" % payload.get("source", "unknown"))
	_update_status_text()
	_update_bag_text()

func _swap_pet() -> void:
	current_action = "swap"
	pet_index = (pet_index + 1) % PETS.size()
	_apply_pet()
	_log_event("Swapped pet to %s" % PETS[pet_index]["name"])
	_update_status_text()

func _update_bag_text() -> void:
	bag_text.text = "BLE %s · Last action: %s" % [ble_bridge.get_transport_mode_label(), current_action]

func _log_event(message: String) -> void:
	journal_entries.append(message)
	if journal_entries.size() > 18:
		journal_entries = journal_entries.slice(journal_entries.size() - 18, journal_entries.size())
	_update_journal_text()

func _update_journal_text() -> void:
	if journal_entries.is_empty():
		journal_log.text = "[i]No events yet.[/i]"
		return
	var out := ""
	for i in range(journal_entries.size()):
		out += "• %s\n" % journal_entries[i]
	journal_log.text = out.strip_edges()

func _apply_expression_visuals() -> void:
	var tint := Color(1, 1, 1, 1)
	var scale := Vector2(1.0, 1.0)

	match expression_state:
		"Hungry":
			tint = Color(0.95, 0.86, 0.72, 1)
		"Sleepy":
			tint = Color(0.78, 0.84, 1.0, 1)
		"Excited":
			tint = Color(1.0, 0.95, 0.70, 1)
			scale = Vector2(1.04, 1.04)
		"Sad":
			tint = Color(0.78, 0.78, 0.86, 1)
		"Determined":
			tint = Color(1.0, 0.82, 0.82, 1)
		_:
			tint = Color(1, 1, 1, 1)

	if current_action == "feed":
		tint = tint.lerp(Color(0.88, 1.0, 0.88, 1), 0.45)
	elif current_action == "heal":
		tint = tint.lerp(Color(0.92, 1.0, 1.0, 1), 0.45)
	elif current_action in ["catch", "spin"]:
		scale = Vector2(1.03, 1.03)

	pet_texture.modulate = tint
	pet_texture.scale = scale

func _pretty_team(team: String) -> String:
	match team:
		"valor":
			return "Valor"
		"mystic":
			return "Mystic"
		"instinct":
			return "Instinct"
		_:
			return "Mystic"

func _on_resized() -> void:
	_apply_watch_layout()

func _on_ble_transport_status(text: String) -> void:
	_log_event(text)
	_update_bag_text()
	_update_ble_mode_button_text()

func _update_shape_button_text() -> void:
	shape_button.text = "Shape: %s" % layout_shape_mode.to_upper()

func _update_ble_mode_button_text() -> void:
	ble_mode_button.text = "BLE: %s" % ble_bridge.get_transport_mode_label()

func _apply_watch_layout() -> void:
	var viewport_size := get_viewport_rect().size
	var w := maxf(1.0, viewport_size.x)
	var h := maxf(1.0, viewport_size.y)
	var is_small := minf(w, h) <= WATCH_BREAKPOINT
	var near_square := absf((w / h) - 1.0) <= ROUND_ASPECT_TOLERANCE
	var detected_round := is_small and near_square

	var effective_round := detected_round
	if layout_shape_mode == "round":
		effective_round = true
	elif layout_shape_mode == "rect":
		effective_round = false

	if is_small:
		title_label.add_theme_font_size_override("font_size", 18)
		status_label.add_theme_font_size_override("font_size", 13)
		pet_name.add_theme_font_size_override("font_size", 14)
		pet_mood.add_theme_font_size_override("font_size", 12)
		action_state.add_theme_font_size_override("font_size", 12)
		journal_log.add_theme_font_size_override("normal_font_size", 12)
		bag_text.add_theme_font_size_override("font_size", 12)

		pet_texture.custom_minimum_size = Vector2(150, 116)
		pokedex_list.custom_minimum_size = Vector2(300, 150)
		journal_log.custom_minimum_size = Vector2(320, 170)
	else:
		title_label.add_theme_font_size_override("font_size", 24)
		status_label.add_theme_font_size_override("font_size", 16)
		pet_name.add_theme_font_size_override("font_size", 16)
		pet_mood.add_theme_font_size_override("font_size", 14)
		action_state.add_theme_font_size_override("font_size", 14)
		journal_log.add_theme_font_size_override("normal_font_size", 14)
		bag_text.add_theme_font_size_override("font_size", 14)

		pet_texture.custom_minimum_size = Vector2(220, 170)
		pokedex_list.custom_minimum_size = Vector2(420, 180)
		journal_log.custom_minimum_size = Vector2(500, 220)

	# Dynamic shape-aware margins (detected + override)
	var edge_margin := 18.0
	if is_small:
		edge_margin = 12.0
	if effective_round:
		edge_margin = 26.0

	if has_node("PetPanel"):
		$PetPanel.offset_left = edge_margin
		$PetPanel.offset_top = 205.0 if not is_small else 195.0
		$PetPanel.offset_right = -edge_margin
		$PetPanel.offset_bottom = -95.0 if not is_small else -82.0

	if has_node("HudPanels"):
		$HudPanels.offset_left = edge_margin
		$HudPanels.offset_top = 205.0 if not is_small else 195.0
		$HudPanels.offset_right = -edge_margin
		$HudPanels.offset_bottom = -95.0 if not is_small else -82.0

	if has_node("Status"):
		$Status.offset_left = edge_margin
		$Status.offset_right = -edge_margin
