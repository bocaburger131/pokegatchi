extends Control

@onready var play_button: Button = $ModeBar/PlayButton
@onready var auto_button: Button = $ModeBar/AutoButton
@onready var scene_button: Button = $ModeBar/SceneButton
@onready var status_label: Label = $Status

var current_mode := "Play"

func _ready() -> void:
	play_button.pressed.connect(func(): _set_mode("Play"))
	auto_button.pressed.connect(func(): _set_mode("Auto"))
	scene_button.pressed.connect(func(): _set_mode("Scene"))
	_set_mode("Play")

func _set_mode(mode: String) -> void:
	current_mode = mode
	status_label.text = "Mode: %s" % mode
	play_button.disabled = mode == "Play"
	auto_button.disabled = mode == "Auto"
	scene_button.disabled = mode == "Scene"
