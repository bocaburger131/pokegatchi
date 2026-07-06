extends Node

const SAVE_PATH := "user://game_state.cfg"

var current_team: String = ""
var current_mode: String = "Play"
# auto | round | rect
var layout_shape_mode: String = "auto"

# Sample pet state
var hunger: int = 50
var happiness: int = 70
var energy: int = 80

# HUD demo state (Task 4)
var bag_items: Dictionary = {
	"Poké Ball": 15,
	"Great Ball": 4,
	"Berry": 6,
	"Potion": 3,
}
var pokedex_seen: Array[String] = ["Eevee", "Psyduck"]
var journal_entries: Array[String] = []

func _ready() -> void:
	load_state()
	if journal_entries.is_empty():
		journal_entries.append("[%s] Session boot" % _timestamp())

func set_team(team: String) -> void:
	current_team = team
	save_state()

func set_mode(mode: String) -> void:
	current_mode = mode
	save_state()

func set_layout_shape_mode(mode: String) -> void:
	if mode in ["auto", "round", "rect"]:
		layout_shape_mode = mode
		save_state()

func set_stats(new_hunger: int, new_happiness: int, new_energy: int) -> void:
	hunger = clampi(new_hunger, 0, 100)
	happiness = clampi(new_happiness, 0, 100)
	energy = clampi(new_energy, 0, 100)
	save_state()

func add_journal_entry(entry: String) -> void:
	journal_entries.append("[%s] %s" % [_timestamp(), entry])
	if journal_entries.size() > 80:
		journal_entries = journal_entries.slice(journal_entries.size() - 80, journal_entries.size())
	save_state()

func register_species(name: String) -> void:
	if not pokedex_seen.has(name):
		pokedex_seen.append(name)
	save_state()

func add_item(item_name: String, amount: int = 1) -> void:
	bag_items[item_name] = int(bag_items.get(item_name, 0)) + amount
	save_state()

func load_state() -> void:
	var cfg := ConfigFile.new()
	var err := cfg.load(SAVE_PATH)
	if err != OK:
		return

	current_team = str(cfg.get_value("player", "team", ""))
	current_mode = str(cfg.get_value("player", "mode", "Play"))
	layout_shape_mode = str(cfg.get_value("player", "layout_shape_mode", "auto"))
	hunger = int(cfg.get_value("pet", "hunger", 50))
	happiness = int(cfg.get_value("pet", "happiness", 70))
	energy = int(cfg.get_value("pet", "energy", 80))

	var loaded_items = cfg.get_value("hud", "bag_items", bag_items)
	if loaded_items is Dictionary:
		bag_items = loaded_items

	var loaded_seen = cfg.get_value("hud", "pokedex_seen", pokedex_seen)
	if loaded_seen is Array:
		pokedex_seen = loaded_seen

	var loaded_journal = cfg.get_value("hud", "journal_entries", journal_entries)
	if loaded_journal is Array:
		journal_entries = loaded_journal

func save_state() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("player", "team", current_team)
	cfg.set_value("player", "mode", current_mode)
	cfg.set_value("player", "layout_shape_mode", layout_shape_mode)
	cfg.set_value("pet", "hunger", hunger)
	cfg.set_value("pet", "happiness", happiness)
	cfg.set_value("pet", "energy", energy)
	cfg.set_value("hud", "bag_items", bag_items)
	cfg.set_value("hud", "pokedex_seen", pokedex_seen)
	cfg.set_value("hud", "journal_entries", journal_entries)
	cfg.save(SAVE_PATH)

func _timestamp() -> String:
	return Time.get_datetime_string_from_system().replace("T", " ")
