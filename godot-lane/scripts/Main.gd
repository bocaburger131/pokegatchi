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
	{"id": "133", "name": "Eevee", "type": "Normal", "texture_path": "res://assets/sprites/eevee_skin_v2_compact.png", "idle_amp": 0.018, "idle_speed": 2.2},
	{"id": "054", "name": "Psyduck", "type": "Water", "texture_path": "res://assets/sprites/psyduck_skin_v1.png", "idle_amp": 0.016, "idle_speed": 1.9},
	{"id": "025", "name": "Pikachu", "type": "Electric", "texture_path": "res://assets/sprites/pikachu_skin_v1.png", "idle_amp": 0.022, "idle_speed": 2.6},
	{"id": "001", "name": "Bulbasaur", "type": "Grass/Poison", "texture_path": "res://assets/sprites/bulbasaur_skin_v1.png", "idle_amp": 0.017, "idle_speed": 2.0},
	{"id": "004", "name": "Charmander", "type": "Fire", "texture_path": "res://assets/sprites/charmander_skin_v1.png", "idle_amp": 0.023, "idle_speed": 2.8},
	{"id": "007", "name": "Squirtle", "type": "Water", "texture_path": "res://assets/sprites/squirtle_skin_v1.png", "idle_amp": 0.017, "idle_speed": 2.1}
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
@onready var ziva_button: Button = $ModeBar/ZivaButton
@onready var settings_button: Button = $ModeBar/SettingsButton

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

@onready var settings_overlay: Control = $SettingsOverlay
@onready var mode_select: OptionButton = $SettingsOverlay/SettingsPanel/SettingsVBox/ModeRow/ModeSelect
@onready var catch_anim_toggle: CheckButton = $SettingsOverlay/SettingsPanel/SettingsVBox/CatchAnimToggle
@onready var spin_anim_toggle: CheckButton = $SettingsOverlay/SettingsPanel/SettingsVBox/SpinAnimToggle
@onready var pgp_auto_catch_toggle: CheckButton = $SettingsOverlay/SettingsPanel/SettingsVBox/PgpAutoCatchToggle
@onready var pgp_auto_spin_toggle: CheckButton = $SettingsOverlay/SettingsPanel/SettingsVBox/PgpAutoSpinToggle
@onready var pgp_alerts_toggle: CheckButton = $SettingsOverlay/SettingsPanel/SettingsVBox/PgpAlertsToggle
@onready var pgp_vibrate_toggle: CheckButton = $SettingsOverlay/SettingsPanel/SettingsVBox/PgpVibrateToggle
@onready var close_settings_button: Button = $SettingsOverlay/SettingsPanel/SettingsVBox/SettingsButtons/CloseSettingsButton
@onready var save_settings_button: Button = $SettingsOverlay/SettingsPanel/SettingsVBox/SettingsButtons/SaveSettingsButton

var current_mode := "Play"
var current_team := "mystic"
var layout_shape_mode := "auto"
var core_mode := "pokegatchi"
var catch_anim_enabled := true
var spin_anim_enabled := true
var pgp_auto_catch := true
var pgp_auto_spin := true
var pgp_alerts_enabled := true
var pgp_vibrate_enabled := true
var expression_state := "Neutral"
var hunger := 72.0
var happiness := 80.0
var energy := 66.0
var pet_index := 0
var current_action := "idle"
var active_panel := "bag"
var journal_entries: Array[String] = []
const BLE_BRIDGE_SCRIPT = preload("res://scripts/ble/BleEventBridge.gd")

var ble_provider_mode := "mock"
var ble_bridge

var _anim_time := 0.0
var _action_timer := 0.0
var _idle_phase_offset := 0.0

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
	ziva_button.pressed.connect(_open_ziva_panel)
	settings_button.pressed.connect(_open_settings)

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

	# Settings controls
	save_settings_button.pressed.connect(_save_settings)
	close_settings_button.pressed.connect(_close_settings)

	# Task 5 BLE bridge simulation hooks
	ble_bridge = BLE_BRIDGE_SCRIPT.new()
	ble_bridge.event_received.connect(_on_ble_event_received)
	ble_bridge.transport_status_changed.connect(_on_ble_transport_status)

	if Engine.has_singleton("GameState"):
		current_team = GameState.get_team()
		current_mode = GameState.current_mode
		core_mode = String(GameState.core_mode)
		catch_anim_enabled = bool(GameState.catch_anim_enabled)
		spin_anim_enabled = bool(GameState.spin_anim_enabled)
		pgp_auto_catch = bool(GameState.pgp_auto_catch)
		pgp_auto_spin = bool(GameState.pgp_auto_spin)
		pgp_alerts_enabled = bool(GameState.pgp_alerts_enabled)
		pgp_vibrate_enabled = bool(GameState.pgp_vibrate_enabled)
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
	_apply_mode_visibility()
	_sync_settings_ui()

	# runtime responsive pass
	resized.connect(_on_resized)

	team_overlay.visible = current_team == ""

func _process(delta: float) -> void:
	ble_bridge.poll()
	_anim_time += delta
	if _action_timer > 0.0:
		_action_timer = maxf(0.0, _action_timer - delta)
		if _action_timer == 0.0 and current_action not in ["idle", "swap"]:
			current_action = "idle"

	# lightweight idle decay + Auto mode bonus
	hunger = clamp(hunger - 2.2 * delta, 0.0, 100.0)
	energy = clamp(energy - 1.5 * delta, 0.0, 100.0)
	if current_mode == "Auto":
		happiness = clamp(happiness + 0.4 * delta, 0.0, 100.0)
	else:
		happiness = clamp(happiness - 0.45 * delta, 0.0, 100.0)

	if core_mode == "pgp":
		hunger = clamp(hunger + 0.25 * delta, 0.0, 100.0)
		energy = clamp(energy + 0.15 * delta, 0.0, 100.0)

	if Engine.has_singleton("GameState"):
		GameState.set_stats(int(hunger), int(happiness), int(energy))

	_update_stats_ui()
	_update_mood_text()
	_apply_sprite_animation(delta)

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
	_apply_mode_visibility()
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
	var mode: String = ble_bridge.toggle_transport_mode()
	_update_ble_mode_button_text()
	_log_event("BLE transport: %s" % mode.to_upper())

func _open_settings() -> void:
	_sync_settings_ui()
	settings_overlay.visible = true

func _close_settings() -> void:
	settings_overlay.visible = false

func _sync_settings_ui() -> void:
	mode_select.clear()
	mode_select.add_item("Pokégatchi Mode", 0)
	mode_select.add_item("PGP Mode", 1)
	mode_select.select(1 if core_mode == "pgp" else 0)
	catch_anim_toggle.button_pressed = catch_anim_enabled
	spin_anim_toggle.button_pressed = spin_anim_enabled
	pgp_auto_catch_toggle.button_pressed = pgp_auto_catch
	pgp_auto_spin_toggle.button_pressed = pgp_auto_spin
	pgp_alerts_toggle.button_pressed = pgp_alerts_enabled
	pgp_vibrate_toggle.button_pressed = pgp_vibrate_enabled

func _save_settings() -> void:
	var selected := mode_select.get_selected_id()
	core_mode = "pgp" if selected == 1 else "pokegatchi"
	catch_anim_enabled = catch_anim_toggle.button_pressed
	spin_anim_enabled = spin_anim_toggle.button_pressed
	pgp_auto_catch = pgp_auto_catch_toggle.button_pressed
	pgp_auto_spin = pgp_auto_spin_toggle.button_pressed
	pgp_alerts_enabled = pgp_alerts_toggle.button_pressed
	pgp_vibrate_enabled = pgp_vibrate_toggle.button_pressed
	if Engine.has_singleton("GameState"):
		GameState.set_core_mode(core_mode)
		GameState.set_anim_toggles(catch_anim_enabled, spin_anim_enabled)
		GameState.set_pgp_settings(pgp_auto_catch, pgp_auto_spin, pgp_alerts_enabled, pgp_vibrate_enabled)
	_apply_mode_visibility()
	_update_status_text()
	_log_event("Settings saved: mode=%s catch_anim=%s spin_anim=%s auto_catch=%s auto_spin=%s alerts=%s vibrate=%s" % [core_mode, str(catch_anim_enabled), str(spin_anim_enabled), str(pgp_auto_catch), str(pgp_auto_spin), str(pgp_alerts_enabled), str(pgp_vibrate_enabled)])
	settings_overlay.visible = false

func _apply_mode_visibility() -> void:
	var pgp := core_mode == "pgp"
	feed_button.visible = not pgp
	pet_button.visible = not pgp
	heal_button.visible = not pgp
	if pgp:
		catch_button.text = "Auto Catch" if pgp_auto_catch else "Catch"
		spin_button.text = "Auto Spin" if pgp_auto_spin else "Spin"
	else:
		catch_button.text = "Catch"
		spin_button.text = "Spin"

func _open_ziva_panel() -> void:
	var has_installer := FileAccess.file_exists("res://addons/ziva_installer/plugin.cfg")
	var has_agent := DirAccess.dir_exists_absolute("res://addons/ziva_agent")

	if has_agent:
		_log_event("Ziva Agent detected. Open it from right dock: Ziva Agent panel.")
		status_label.text = "Ziva Agent ready · Open dock panel"
		return

	if has_installer:
		_log_event("Ziva installer ready: Project > Project Settings > Plugins > Enable ziva_installer, then click Install Ziva AI Agent in dock.")
		status_label.text = "Ziva installer present · Enable plugin + install"
		return

	_log_event("Ziva not installed in this project yet.")
	status_label.text = "Ziva missing"

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
	for pet in PETS:
		pokedex_list.add_item("#%s %s — %s" % [pet.get("id", "???"), pet.get("name", "Unknown"), pet.get("type", "Normal")])

func _update_status_text() -> void:
	var mode_label := "PGP" if core_mode == "pgp" else "Pokégatchi"
	status_label.text = "Mode: %s · Core: %s · Team: %s · Action: %s" % [current_mode, mode_label, _pretty_team(current_team), current_action]

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
	var tex_path := String(pet.get("texture_path", ""))
	var tex: Texture2D = load(tex_path) as Texture2D
	if tex != null:
		pet_texture.texture = tex
	else:
		push_warning("Missing pet texture: %s" % tex_path)
	_idle_phase_offset = float(pet_index) * 0.37
	pet_texture.rotation = 0.0

func _feed() -> void:
	current_action = "feed"
	_action_timer = 0.75
	hunger = clamp(hunger + 24.0, 0.0, 100.0)
	happiness = clamp(happiness + 5.0, 0.0, 100.0)
	energy = clamp(energy + 2.0, 0.0, 100.0)
	_log_event("Fed %s" % PETS[pet_index]["name"])
	_update_status_text()

func _pet() -> void:
	current_action = "pet"
	_action_timer = 0.7
	happiness = clamp(happiness + 12.0, 0.0, 100.0)
	energy = clamp(energy - 2.0, 0.0, 100.0)
	_log_event("Petted %s" % PETS[pet_index]["name"])
	_update_status_text()

func _heal() -> void:
	current_action = "heal"
	_action_timer = 0.85
	energy = clamp(energy + 20.0, 0.0, 100.0)
	happiness = clamp(happiness + 3.0, 0.0, 100.0)
	_log_event("Healed %s" % PETS[pet_index]["name"])
	_update_status_text()

func _catch() -> void:
	current_action = "catch"
	if core_mode == "pgp" and not pgp_auto_catch:
		_log_event("PGP Auto Catch is OFF")
		_update_status_text()
		return
	if catch_anim_enabled:
		_action_timer = 0.6
	else:
		_action_timer = 0.0
	if core_mode == "pgp":
		happiness = clamp(happiness + 4.0, 0.0, 100.0)
		energy = clamp(energy - 1.0, 0.0, 100.0)
		if pgp_alerts_enabled:
			_log_event("PGP alert: Pokémon nearby")
		if pgp_vibrate_enabled:
			_log_event("PGP vibrate: catch pulse")
	ble_bridge.simulate_catch("sample")
	_update_status_text()

func _spin() -> void:
	current_action = "spin"
	if core_mode == "pgp" and not pgp_auto_spin:
		_log_event("PGP Auto Spin is OFF")
		_update_status_text()
		return
	if spin_anim_enabled:
		_action_timer = 0.55
	else:
		_action_timer = 0.0
	if core_mode == "pgp":
		happiness = clamp(happiness + 3.0, 0.0, 100.0)
		energy = clamp(energy - 0.8, 0.0, 100.0)
		if pgp_alerts_enabled:
			_log_event("PGP alert: Pokéstop in range")
		if pgp_vibrate_enabled:
			_log_event("PGP vibrate: spin pulse")
	ble_bridge.simulate_spin("sample")
	_update_status_text()

func _on_ble_event_received(event_type: String, payload: Dictionary) -> void:
	if event_type == "caught":
		happiness = clamp(happiness + 8.0, 0.0, 100.0)
		energy = clamp(energy - 4.0, 0.0, 100.0)
		current_action = "catch"
		_log_event("BLE catch event (%s)" % payload.get("source", "unknown"))
	elif event_type == "spun":
		happiness = clamp(happiness + 5.0, 0.0, 100.0)
		energy = clamp(energy - 2.0, 0.0, 100.0)
		current_action = "spin"
		_log_event("BLE spin event (%s)" % payload.get("source", "unknown"))
	elif event_type == "fled":
		happiness = clamp(happiness - 9.0, 0.0, 100.0)
		current_action = "flee"
		_log_event("BLE flee event (%s)" % payload.get("source", "unknown"))
	_update_status_text()
	_update_bag_text()

func _swap_pet() -> void:
	current_action = "swap"
	_action_timer = 0.45
	pet_index = (pet_index + 1) % PETS.size()
	_apply_pet()
	_log_event("Swapped pet to %s" % PETS[pet_index]["name"])
	_update_status_text()

func _update_bag_text() -> void:
	bag_text.text = "BLE %s · Last action: %s · Event schema: caught/spun/fled" % [ble_bridge.get_transport_mode_label(), current_action]

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
	if _action_timer <= 0.0:
		pet_texture.scale = scale

func _apply_sprite_animation(_delta: float) -> void:
	var pet: Dictionary = PETS[pet_index]
	var amp := float(pet.get("idle_amp", 0.016))
	var speed := float(pet.get("idle_speed", 2.1))
	var base := Vector2.ONE
	var pulse := sin((_anim_time + _idle_phase_offset) * speed)
	var bob := sin((_anim_time + _idle_phase_offset) * (speed * 0.5))

	var anim_scale := base + Vector2(pulse * amp, -pulse * amp * 0.55)
	pet_texture.position.y = bob * 4.0

	if _action_timer > 0.0:
		var t := 1.0 - (_action_timer / maxf(_action_timer, 0.0001))
		if current_action == "feed":
			anim_scale += Vector2(0.045 * sin(_anim_time * 13.0), 0.03)
		elif current_action == "pet":
			anim_scale += Vector2(0.04, 0.04) * absf(sin(_anim_time * 10.0))
		elif current_action == "heal":
			anim_scale += Vector2(0.06 * sin(_anim_time * 8.0), 0.02)
		elif current_action == "catch":
			if catch_anim_enabled:
				pet_texture.rotation = sin(_anim_time * 26.0) * 0.06
				anim_scale += Vector2(0.08, 0.08) * (1.0 - t)
		elif current_action == "spin":
			if spin_anim_enabled:
				pet_texture.rotation = sin(_anim_time * 30.0) * 0.08
				anim_scale += Vector2(0.05, 0.05)
		elif current_action == "swap":
			pet_texture.rotation = sin(_anim_time * 22.0) * 0.04
			anim_scale += Vector2(0.04, 0.04)
	else:
		pet_texture.rotation = lerp(pet_texture.rotation, 0.0, 0.18)

	pet_texture.scale = anim_scale

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
