extends Node

const SAVE_PATH := "user://game_state.cfg"

var current_team: String = ""
var current_mode: String = "Play"

func _ready() -> void:
	load_state()

func set_team(team: String) -> void:
	current_team = team
	save_state()

func set_mode(mode: String) -> void:
	current_mode = mode
	save_state()

func load_state() -> void:
	var cfg := ConfigFile.new()
	var err := cfg.load(SAVE_PATH)
	if err != OK:
		return

	current_team = str(cfg.get_value("player", "team", ""))
	current_mode = str(cfg.get_value("player", "mode", "Play"))

func save_state() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("player", "team", current_team)
	cfg.set_value("player", "mode", current_mode)
	cfg.save(SAVE_PATH)
