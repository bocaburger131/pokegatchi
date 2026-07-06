extends RefCounted
class_name BleTransportAdapter

const MODE_SIM := "sim"
const MODE_UDP := "udp"

var mode: String = MODE_SIM
var udp_port: int = 9876
var udp_bind_ip: String = "0.0.0.0"

func next_mode(current: String) -> String:
	if current == MODE_SIM:
		return MODE_UDP
	return MODE_SIM

func mode_label(current: String) -> String:
	if current == MODE_UDP:
		return "UDP"
	return "SIM"
