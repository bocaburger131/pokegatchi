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

@onready var bg: ColorRect = $Background
@onready var accent_bar: ColorRect = $AccentBar
@onready var title_label: Label = $Title
@onready var team_badge: Button = $TeamBadge
@onready var team_overlay: Control = $TeamOverlay

@onready var play_button: Button = $ModeBar/PlayButton
@onready var auto_button: Button = $ModeBar/AutoButton
@onready var scene_button: Button = $ModeBar/SceneButton
@onready var status_label: Label = $Status

@onready var valor_button: Button = $TeamOverlay/TeamButtons/ValorButton
@onready var mystic_button: Button = $TeamOverlay/TeamButtons/MysticButton
@onready var instinct_button: Button = $TeamOverlay/TeamButtons/InstinctButton

@onready var pet_sprite: TextureRect = $PetPanel/VBox/PetSprite
@onready var hunger_bar: ProgressBar = $PetPanel/VBox/Stats/HungerBar
@onready var happiness_bar: ProgressBar = $PetPanel/VBox/Stats/HappyBar
@onready var energy_bar: ProgressBar = $PetPanel/VBox/Stats/EnergyBar
@onready var feed_button: Button = $PetPanel/VBox/Actions/FeedButton
@onready var pet_button: Button = $PetPanel/VBox/Actions/PetButton
@onready var heal_button: Button = $PetPanel/VBox/Actions/HealButton

var current_mode := "Play"
var current_team := ""
var pet_index := 0

func _ready() -> void:
	play_button.pressed.connect(func(): _set_mode("Play"))
	auto_button.pressed.connect(func(): _set_mode("Auto"))
	scene_button.pressed.connect(func(): _set_mode("Scene"))

	valor_button.pressed.connect(func(): _select_team("valor"))
	mystic_button.pressed.connect(func(): _select_team("mystic"))
	instinct_button.pressed.connect(func(): _select_team("instinct"))

	feed_button.pressed.connect(_on_feed_pressed)
	pet_button.pressed.connect(_on_pet_pressed)
	heal_button.pressed.connect(_on_heal_pressed)

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
	team_badge.pressed.connect(_on_team_badge_pressed)

func _process(delta: float) -> void:
	if not Engine.has_singleton("GameState"):
		return
	# tiny idle loop so sample feels alive
	var hunger := GameState.hunger - int(2.0 * delta)
	var happiness := GameState.happiness - int(1.0 * delta)
	var energy := GameState.energy - int(1.0 * delta)
	GameState.set_stats(hunger, happiness, energy)
	_refresh_stats_ui()

func _select_team(team: String) -> void:
	current_team = team
	team_overlay.visible = false
	team_badge.text = "Team: %s" % _pretty_team(team)
	_apply_team_visuals(team)
	if Engine.has_singleton("GameState"):
		GameState.set_team(team)

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
	pet_sprite.texture = PETS[pet_index]["texture"]

func _refresh_stats_ui() -> void:
	if not Engine.has_singleton("GameState"):
		return
	hunger_bar.value = GameState.hunger
	happiness_bar.value = GameState.happiness
	energy_bar.value = GameState.energy

func _on_feed_pressed() -> void:
	if not Engine.has_singleton("GameState"):
		return
	GameState.set_stats(GameState.hunger + 18, GameState.happiness + 6, GameState.energy + 4)
	_refresh_stats_ui()
	_swap_pet()

func _on_pet_pressed() -> void:
	if not Engine.has_singleton("GameState"):
		return
	GameState.set_stats(GameState.hunger + 2, GameState.happiness + 14, GameState.energy - 3)
	_refresh_stats_ui()

func _on_heal_pressed() -> void:
	if not Engine.has_singleton("GameState"):
		return
	GameState.set_stats(GameState.hunger + 2, GameState.happiness + 4, GameState.energy + 20)
	_refresh_stats_ui()

func _swap_pet() -> void:
	pet_index = (pet_index + 1) % PETS.size()
	_refresh_pet_visual()

func _on_team_badge_pressed() -> void:
	team_overlay.visible = true

func _on_close_overlay_pressed() -> void:
	team_overlay.visible = false
