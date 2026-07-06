# BLE Event Bridge UDP Demo

Task 8 introduces a real transport option in addition to SIM mode.

## Modes
- `SIM`: internal button-driven events only
- `UDP`: listens on `0.0.0.0:9876` and parses incoming lines

The mode can be toggled in the UI with the `BLE: ...` button.

## UDP payload format
Send plain text lines containing either `catch` or `spin`.
Examples:
- `catch`
- `spin`
- `event=catch source=pgp`

## Quick send examples

### Linux/macOS
```bash
printf 'catch\n' | nc -u 127.0.0.1 9876
printf 'spin\n'  | nc -u 127.0.0.1 9876
```

### Windows PowerShell
```powershell
$udp = New-Object System.Net.Sockets.UdpClient
$bytes = [Text.Encoding]::UTF8.GetBytes("catch")
$udp.Send($bytes, $bytes.Length, "127.0.0.1", 9876) | Out-Null
$udp.Close()
```
