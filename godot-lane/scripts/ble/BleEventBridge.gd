extends RefCounted
class_name BleEventBridge

signal event_received(event_type: String, payload: Dictionary)
signal provider_changed(provider_name: String)
signal transport_status_changed(status_text: String)

const EVENT_CAUGHT := "caught"
const EVENT_SPUN := "spun"
const EVENT_FLED := "fled"

# Backwards-compatible aliases used in older demo flows.
const EVENT_ALIAS_MAP := {
	"catch": EVENT_CAUGHT,
	"spin": EVENT_SPUN,
	"caught": EVENT_CAUGHT,
	"spun": EVENT_SPUN,
	"fled": EVENT_FLED,
}

class BleProviderBase:
	extends RefCounted
	signal provider_event(event_type: String, payload: Dictionary)

	var provider_name: String = "base"
	var connected: bool = true

	func simulate_catch(source: String = "provider") -> void:
		if connected:
			provider_event.emit(EVENT_CAUGHT, {"source": source, "ts": Time.get_unix_time_from_system()})

	func simulate_spin(source: String = "provider") -> void:
		if connected:
			provider_event.emit(EVENT_SPUN, {"source": source, "ts": Time.get_unix_time_from_system()})

	func inject_event(event_type: String, payload: Dictionary = {}) -> void:
		if connected:
			var merged := payload.duplicate()
			if not merged.has("source"):
				merged["source"] = provider_name
			if not merged.has("ts"):
				merged["ts"] = Time.get_unix_time_from_system()
			provider_event.emit(_canonical_event(event_type), merged)

	func poll() -> void:
		pass

class MockBleProvider:
	extends BleProviderBase

	func _init() -> void:
		provider_name = "mock"

class QueueBleProvider:
	extends BleProviderBase

	var queue: Array[Dictionary] = []

	func _init() -> void:
		provider_name = "local"

	func inject_event(event_type: String, payload: Dictionary = {}) -> void:
		var merged := payload.duplicate()
		if not merged.has("source"):
			merged["source"] = provider_name
		if not merged.has("ts"):
			merged["ts"] = Time.get_unix_time_from_system()
		queue.append({"type": _canonical_event(event_type), "payload": merged})

	func simulate_catch(source: String = "provider") -> void:
		inject_event(EVENT_CAUGHT, {"source": source})

	func simulate_spin(source: String = "provider") -> void:
		inject_event(EVENT_SPUN, {"source": source})

	func poll() -> void:
		while not queue.is_empty() and connected:
			var ev := queue.pop_front()
			provider_event.emit(String(ev.get("type", "unknown")), ev.get("payload", {}))

var _provider: BleProviderBase
var _mode: String = "mock"

func _init(provider: BleProviderBase = null) -> void:
	if provider == null:
		provider = MockBleProvider.new()
		_mode = "mock"
	else:
		_mode = provider.provider_name
	set_provider(provider)

func set_provider(provider: BleProviderBase) -> void:
	if _provider != null and _provider.provider_event.is_connected(_on_provider_event):
		_provider.provider_event.disconnect(_on_provider_event)

	_provider = provider
	_provider.provider_event.connect(_on_provider_event)
	provider_changed.emit(get_provider_name())
	transport_status_changed.emit("BLE %s" % get_transport_mode_label())

func get_provider_name() -> String:
	return _provider.provider_name if _provider != null else "none"

func set_connected(is_connected: bool) -> void:
	if _provider != null:
		_provider.connected = is_connected

func is_connected() -> bool:
	return _provider != null and _provider.connected

func simulate_catch(source: String = "bridge") -> void:
	if _provider != null:
		_provider.simulate_catch(source)

func simulate_spin(source: String = "bridge") -> void:
	if _provider != null:
		_provider.simulate_spin(source)

func inject_event(event_type: String, payload: Dictionary = {}) -> void:
	if _provider != null:
		_provider.inject_event(event_type, payload)

func poll() -> void:
	if _provider != null:
		_provider.poll()

func toggle_transport_mode() -> String:
	if _mode == "mock":
		_mode = "local"
		set_provider(QueueBleProvider.new())
	else:
		_mode = "mock"
		set_provider(MockBleProvider.new())
	return _mode

func get_transport_mode_label() -> String:
	if _mode == "local":
		return "LOCAL"
	return "SIM"

func _canonical_event(event_type: String) -> String:
	var key := String(event_type).to_lower()
	if EVENT_ALIAS_MAP.has(key):
		return String(EVENT_ALIAS_MAP[key])
	return key

func _on_provider_event(event_type: String, payload: Dictionary) -> void:
	event_received.emit(_canonical_event(event_type), payload)
