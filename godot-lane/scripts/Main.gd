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

@onready var bg: ColorRect = $Background
@onready var accent_bar: ColorRect = $AccentBar
@onready var team_badge: Label = $TeamBadge
@onready var team_overlay: Control = $TeamOverlay

@onready var play_button: Button = $ModeBar/PlayButton
@onready var auto_button: Button = $ModeBar/AutoButton
@onready var scene_button: Button = $ModeBar/SceneButton
@onready var status_label: Label = $Status

@onready var valor_button: Button = $TeamOverlay/TeamButtons/ValorButton
@onready var mystic_button: Button = $TeamOverlay/TeamButtons/MysticButton
@onready var instinct_button: Button = $TeamOverlay/TeamButtons/InstinctButton

var current_mode := "Play"
var current_team := ""

func _ready() -> void:
	play_button.pressed.connect(func(): _set_mode("Play"))
	auto_button.pressed.connect(func(): _set_mode("Auto"))
	scene_button.pressed.connect(func(): _set_mode("Scene"))

	valor_button.pressed.connect(func(): _select_team("valor"))
	mystic_button.pressed.connect(func(): _select_team("mystic"))
	instinct_button.pressed.connect(func(): _select_team("instinct"))

	# restore persisted state if available
	if Engine.has_singleton("GameState"):
		current_team = GameState.current_team
		current_mode = GameState.current_mode

	if current_team == "":
		team_overlay.visible = true
		_apply_team_visuals("mystic") # neutral preview
		team_badge.text = "Team: Select one"
	else:
		team_overlay.visible = false
		_apply_team_visuals(current_team)
		team_badge.text = "Team: %s" % _pretty_team(current_team)

	_set_mode(current_mode)

func _select_team(team: String) -> void:
	current_team = team
	team_overlay.visible = false
	team_badge.text = "Team: %s" % _pretty_team(team)
	_apply_team_visuals(team)
	if Engine.has_singleton("GameState"):
		GameState.set_team(team)

func _set_mode(mode: String) -> void:
	current_mode = mode
	status_label.text = "Mode: %s" % mode
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
