extends RefCounted
class_name BleEventBridge

signal event_received(event_type: String, payload: Dictionary)

func simulate_catch(source: String = "mock") -> void:
	event_received.emit("catch", {"source": source, "ts": Time.get_unix_time_from_system()})

func simulate_spin(source: String = "mock") -> void:
	event_received.emit("spin", {"source": source, "ts": Time.get_unix_time_from_system()})
