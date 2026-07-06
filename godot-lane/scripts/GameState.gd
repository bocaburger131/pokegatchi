extends Node

const SAVE_PATH := "user://game_state.cfg"

var current_team: String = ""
var current_mode: String = "Play"

# Sample pet state (Task 3)
var hunger: int = 50
var happiness: int = 70
var energy: int = 80

func _ready() -> void:
	load_state()

func set_team(team: String) -> void:
	current_team = team
	save_state()

func set_mode(mode: String) -> void:
	current_mode = mode
	save_state()

func set_stats(new_hunger: int, new_happiness: int, new_energy: int) -> void:
	hunger = clampi(new_hunger, 0, 100)
	happiness = clampi(new_happiness, 0, 100)
	energy = clampi(new_energy, 0, 100)
	save_state()

func load_state() -> void:
	var cfg := ConfigFile.new()
	var err := cfg.load(SAVE_PATH)
	if err != OK:
		return

	current_team = str(cfg.get_value("player", "team", ""))
	current_mode = str(cfg.get_value("player", "mode", "Play"))
	hunger = int(cfg.get_value("pet", "hunger", 50))
	happiness = int(cfg.get_value("pet", "happiness", 70))
	energy = int(cfg.get_value("pet", "energy", 80))

func save_state() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("player", "team", current_team)
	cfg.set_value("player", "mode", current_mode)
	cfg.set_value("pet", "hunger", hunger)
	cfg.set_value("pet", "happiness", happiness)
	cfg.set_value("pet", "energy", energy)
	cfg.save(SAVE_PATH)
