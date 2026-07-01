#!/usr/bin/env python3
"""
Go-tcha Classic BLE GATT Emulator — Handshake Logger
====================================================
Emulates the Datel Go-tcha Classic (RSL10) GATT server using
the cloned profile from nRF Connect. Logs ALL handshake traffic
so you can capture the crypto protocol between Pokemon Go and
the device.

Requirements:
  pip install bless

Usage:
  python gotcha_emulator.py

Then connect Pokemon Go to the advertised device.
All reads/writes/notifications are logged to stdout + gotcha_handshake.log
"""

import asyncio
import json
import logging
import signal
import sys
import time
from datetime import datetime
from typing import Optional

from bless import (
    BlessServer,
    BlessGATTCharacteristic,
    GATTCharacteristicProperties,
    GATTAttributePermissions,
)

# ─── Logging ────────────────────────────────────────────────────────
LOG_FILE = "gotcha_handshake.log"

log = logging.getLogger("gotcha")
log.setLevel(logging.DEBUG)
fmt = logging.Formatter("%(asctime)s.%(msecs)03d | %(message)s", datefmt="%H:%M:%S")

console = logging.StreamHandler(sys.stdout)
console.setLevel(logging.INFO)
console.setFormatter(fmt)
log.addHandler(console)

file_h = logging.FileHandler(LOG_FILE, mode="w")
file_h.setLevel(logging.DEBUG)
file_h.setFormatter(fmt)
log.addHandler(file_h)


def hexdump(data: bytes, label: str = "") -> str:
    """Pretty hex dump for logging."""
    if not data:
        return f"{label}: (empty)"
    lines = []
    for i in range(0, len(data), 16):
        hex_part = " ".join(f"{b:02x}" for b in data[i : i + 16])
        ascii_part = "".join(chr(b) if 32 <= b < 127 else "." for b in data[i : i + 16])
        lines.append(f"  {i:04x}: {hex_part:<48s}  {ascii_part}")
    header = f"{label}: {len(data)} bytes"
    return header + "\n" + "\n".join(lines)


# ─── Go-tcha Classic GATT UUIDs (from nRF Connect clone) ───────────
# Device Info (0x180A)
DEVICE_INFO_SVC = "0000180a-0000-1000-8000-00805f9b34fb"
MANUFACTURER_CHAR = "00002a29-0000-1000-8000-00805f9b34fb"
MODEL_NUM_CHAR = "00002a24-0000-1000-8000-00805f9b34fb"
HARDWARE_REV_CHAR = "00002a27-0000-1000-8000-00805f9b34fb"
FIRMWARE_REV_CHAR = "00002a28-0000-1000-8000-00805f9b34fb"

# Battery (0x180F)
BATTERY_SVC = "0000180f-0000-1000-8000-00805f9b34fb"
BATTERY_LEVEL_CHAR = "00002a19-0000-1000-8000-00805f9b34fb"

# PGP Primary (bbe87709)
PGP_SVC = "bbe87709-5b89-4433-ab7f-8b8eef0d8e37"
PGP_WRITE = "bbe87709-5b89-4433-ab7f-8b8eef0d8e38"  # WRITE  — app sends LED/cmd
PGP_NOTIFY = "bbe87709-5b89-4433-ab7f-8b8eef0d8e39"  # NOTIFY — device responses
PGP_READ = "bbe87709-5b89-4433-ab7f-8b8eef0d8e3a"    # READ   — static data (empty)

# Auth/Handshake (21c50462)
AUTH_SVC = "21c50462-67cb-63a3-5c4c-82b5b9939aeb"
AUTH_W1 = "21c50462-67cb-63a3-5c4c-82b5b9939aec"   # WRITE  — auth cmd 1
AUTH_RN = "21c50462-67cb-63a3-5c4c-82b5b9939aed"   # NOTIFY — auth response
AUTH_W2 = "21c50462-67cb-63a3-5c4c-82b5b9939aee"   # WRITE  — auth cmd 2
AUTH_W3 = "21c50462-67cb-63a3-5c4c-82b5b9939aef"   # WRITE  — auth cmd 3
AUTH_NAME = "21c50462-67cb-63a3-5c4c-82b5b9939af0"  # READ   — "PokemonGoooooooo"

# Encryption/OTP (75579f32)
ENC_SVC = "75579f32-a47a-6782-00cb-8a1e5e592301"
ENC_W1 = "75579f32-a47a-6782-00cb-8a1e5e592302"    # WRITE
ENC_W2 = "75579f32-a47a-6782-00cb-8a1e5e592303"    # WRITE
ENC_BLOB = "75579f32-a47a-6782-00cb-8a1e5e592304"  # READ   — 256-byte blob
ENC_WN = "75579f32-a47a-6782-00cb-8a1e5e592305"    # WRITE+NOTIFY
ENC_W3 = "75579f32-a47a-6782-00cb-8a1e5e592306"    # WRITE

# The 256-byte encryption blob from the cloned device
CLONED_BLOB = bytes.fromhex(
    "17af0700dbc4cb0e6b9c07002f0000009f66e40c00100000"
    "632b4e6be01400002f8c0930601f00001a296ad980320000"
    "ba95aca92052000054454996a06000009a91c699406b0000"
    "ccb798f9a06c00005a879f8e606d0000e0d69617606e0000"
    "76e69160806f0000d573f5fea0700000bbb20528e0710000"
    "ae145919007d0000589d4e60e09300009b6241e580bc0000"
    "899587d1a0cb0000942177ec602a0200c90d54e780470200"
    "7a42f3e6205e02004e2e04c1a07d0200dee89d58a0b60200"
    "f004cb2960ea02006608f0eba04903006a12950a20a20300"
    "2d81971de0ad0300d4130f5220e00300b91fd5a2e0390400"
    "b669a32ba06904002f2fd2d560860400"
)


class GotchaEmulator:
    """Go-tcha Classic BLE GATT Server Emulator with full handshake logging."""

    def __init__(self):
        self.server: Optional[BlessServer] = None
        self.start_time = time.time()
        self.handshake_state = 0
        self.connected = False
        self.client_address: Optional[str] = None

        # Crypto log for later analysis
        self.crypto_log: list[dict] = []

        # Keep track of chars for notifications
        self._pgp_notify_char: Optional[BlessGATTCharacteristic] = None
        self._auth_notify_char: Optional[BlessGATTCharacteristic] = None

    def log_event(self, direction: str, char_label: str, data: bytes):
        """Log a GATT event with hex dump."""
        label = f"{direction} {char_label}"
        log.info(f"\n{'─' * 72}")
        log.info(f"  {label}  ({len(data)} bytes)")
        for line in hexdump(data, char_label).split("\n"):
            log.info(f"  {line}")

    # ─── GATT Server Setup ──────────────────────────────────────────

    async def build_server(self):
        """Create and configure the GATT server."""
        self.server = BlessServer(name="Go-tcha Classic")
        self.server.read_request_func = self._on_read
        self.server.write_request_func = self._on_write

        RP = GATTAttributePermissions
        P = GATTCharacteristicProperties

        # ── Service 1: Device Information ──────────────────────────
        svc_info = await self.server.add_new_service(DEVICE_INFO_SVC)
        await svc_info.add_characteristic(
            MANUFACTURER_CHAR, P.read, RP.readable, b"Datel\x00",
        )
        await svc_info.add_characteristic(
            MODEL_NUM_CHAR, P.read, RP.readable, b"Go-tcha Classic\x00",
        )
        await svc_info.add_characteristic(
            HARDWARE_REV_CHAR, P.read, RP.readable, b"RSL10\x00",
        )
        await svc_info.add_characteristic(
            FIRMWARE_REV_CHAR, P.read, RP.readable, b"1.0.0\x00",
        )

        # ── Service 2: Battery ─────────────────────────────────────
        svc_batt = await self.server.add_new_service(BATTERY_SVC)
        await svc_batt.add_characteristic(
            BATTERY_LEVEL_CHAR, P.read | P.notify, RP.readable, bytes([33]),
        )

        # ── Service 3: PGP Primary ─────────────────────────────────
        svc_pgp = await self.server.add_new_service(PGP_SVC)
        await svc_pgp.add_characteristic(
            PGP_WRITE, P.write, RP.writable, b"",
        )
        self._pgp_notify_char = await svc_pgp.add_characteristic(
            PGP_NOTIFY, P.read | P.notify, RP.readable,
            bytes([0x04, 0x00, 0x23, 0x00]),
        )
        await svc_pgp.add_characteristic(
            PGP_READ, P.read, RP.readable, b"",
        )

        # ── Service 4: Auth/Handshake ──────────────────────────────
        svc_auth = await self.server.add_new_service(AUTH_SVC)
        await svc_auth.add_characteristic(
            AUTH_W1, P.write, RP.writable, b"",
        )
        self._auth_notify_char = await svc_auth.add_characteristic(
            AUTH_RN, P.read | P.notify, RP.readable, bytes([0x00, 0x00]),
        )
        await svc_auth.add_characteristic(
            AUTH_W2, P.write, RP.writable, b"",
        )
        await svc_auth.add_characteristic(
            AUTH_W3, P.write, RP.writable, b"",
        )
        await svc_auth.add_characteristic(
            AUTH_NAME, P.read, RP.readable, b"PokemonGoooooooo\x00",
        )

        # ── Service 5: Encryption/OTP ──────────────────────────────
        svc_enc = await self.server.add_new_service(ENC_SVC)
        await svc_enc.add_characteristic(
            ENC_W1, P.write, RP.writable, b"",
        )
        await svc_enc.add_characteristic(
            ENC_W2, P.write, RP.writable, b"",
        )
        await svc_enc.add_characteristic(
            ENC_BLOB, P.read, RP.readable, CLONED_BLOB,
        )
        self._enc_notify_char = await svc_enc.add_characteristic(
            ENC_WN, P.write | P.notify, RP.writable, b"",
        )
        await svc_enc.add_characteristic(
            ENC_W3, P.write, RP.writable, b"",
        )

        log.info("  ✓ GATT profile built: 5 services, 23 characteristics")

    # ─── Read Handler ───────────────────────────────────────────────

    async def _on_read(self, characteristic: BlessGATTCharacteristic, **kwargs) -> bytes:
        """Called when a GATT client reads a characteristic."""
        uuid = characteristic.uuid
        val = characteristic.value or b""
        log.info(f"\n{'─' * 72}")
        log.info(f"📤 READ: {uuid}  ({len(val)} bytes)")
        return val

    # ─── Write Handler ──────────────────────────────────────────────

    async def _on_write(self, characteristic: BlessGATTCharacteristic, value: bytes, **kwargs):
        """Called when a GATT client writes to a characteristic."""
        uuid = characteristic.uuid

        # Route to the right handler
        if uuid == PGP_WRITE:
            await self._handle_pgp_write(value)
        elif uuid == AUTH_W1:
            await self._handle_auth_w1(value)
        elif uuid == AUTH_W2:
            self._log_simple_write("AUTH_W2", value)
        elif uuid == AUTH_W3:
            self._log_simple_write("AUTH_W3", value)
        elif uuid == ENC_W1:
            self._log_enc_write("ENC_W1", value)
        elif uuid == ENC_W2:
            self._log_enc_write("ENC_W2", value)
        elif uuid == ENC_WN:
            self._log_enc_write("ENC_WN", value)
        elif uuid == ENC_W3:
            self._log_enc_write("ENC_W3", value)
        else:
            log.info(f"\n{'─' * 72}")
            log.info(f"📥 WRITE (unknown): {uuid}")
            log.info(hexdump(value, "data"))

    # ─── PGP Write: LED Pattern Handler ─────────────────────────────

    async def _handle_pgp_write(self, data: bytes):
        self.log_event("📥", "PGP_WRITE", data)

        if len(data) >= 4:
            count = data[3] & 0x1F
            read_time = data[0]
            log.info(f"     Pattern count: {count}, Read time: {read_time}")

            for i in range(count):
                off = 4 + i * 3
                if off + 3 > len(data):
                    break
                dur = data[off] * 50
                g = (data[off + 1] >> 4) & 0x0F
                r = data[off + 1] & 0x0F
                b = data[off + 2] & 0x0F
                v = (data[off + 2] >> 4) & 0x07
                interp = (data[off + 2] >> 7) == 1
                log.info(f"     Pattern #{i}: dur={dur}ms  R={r} G={g} B={b}  vib={v} interp={interp}")

        event = self._classify_led(data)
        log.info(f"     🎯 Event: {event}")

    def _classify_led(self, data: bytes) -> str:
        if len(data) < 4:
            return "unknown"
        count = data[3] & 0x1F
        if count == 0:
            return "unknown"
        pats = []
        for i in range(count):
            off = 4 + i * 3
            if off + 3 > len(data):
                break
            pats.append({
                "r": data[off + 1] & 0x0F,
                "g": (data[off + 1] >> 4) & 0x0F,
                "b": data[off + 2] & 0x0F,
            })
        off = any(p["r"] == 0 and p["g"] == 0 and p["b"] == 0 for p in pats)
        g = any(p["g"] > 0 and p["r"] == 0 and p["b"] == 0 for p in pats)
        bl = any(p["b"] > 0 and p["r"] == 0 and p["g"] == 0 for p in pats)
        r = any(p["r"] > 0 and p["g"] == 0 and p["b"] == 0 for p in pats)
        y = any(p["r"] > 0 and p["g"] > 0 and p["b"] == 0 for p in pats)
        w = any(p["r"] > 0 and p["g"] > 0 and p["b"] > 0 for p in pats)
        shake = count >= 4 and w and off
        if shake:
            last = [p for p in pats if p["r"] > 0 or p["g"] > 0 or p["b"] > 0]
            if last:
                l = last[-1]
                if l["g"] > 0 and l["b"] > 0:
                    return "CAUGHT"
                if l["r"] > 0 and l["g"] == 0 and l["b"] == 0:
                    return "FLED"
            return "ball_shake"
        if g and not bl and not r and not y and not w:
            return "POKEMON_NEARBY"
        if y:
            return "NEW_SPECIES"
        if bl and not g and not r:
            return "POKESTOP_NEARBY"
        if w and not off:
            return "SPUN (got items)"
        if r and not off:
            return "BAG_FULL"
        if r and off:
            return "OUT_OF_BALLS"
        return "unknown"

    # ─── Auth Handlers ──────────────────────────────────────────────

    async def _handle_auth_w1(self, data: bytes):
        self.log_event("📥", "AUTH_W1", data)
        log.info(f"     Handshake state: {self.handshake_state}")

        if self.handshake_state == 0:
            # Step 1: Button ready
            resp = bytes([0x01, 0x00])
            if self._auth_notify_char:
                self._auth_notify_char.value = resp
            await self.server.update_value(AUTH_SVC, AUTH_RN)
            log.info(f"📤 NOTIFY AUTH_RN → {resp.hex()} (button ready)")
            self.handshake_state = 1

        elif self.handshake_state == 1:
            # Step 2: Activate PGP
            pgp = bytes([0x04, 0x00, 0x23, 0x00])
            if self._pgp_notify_char:
                self._pgp_notify_char.value = pgp
            await self.server.update_value(PGP_SVC, PGP_NOTIFY)
            log.info(f"📤 NOTIFY PGP_NOTIFY → {pgp.hex()} (connected + notifying)")
            self.handshake_state = 2

        elif self.handshake_state >= 2:
            log.info(f"     Already authenticated — treating as LED data")
            await self._handle_pgp_write(data)

    def _log_simple_write(self, label: str, data: bytes):
        self.log_event("📥", label, data)

    # ─── Encryption Write Handler (CRITICAL — captures crypto) ──────

    def _log_enc_write(self, label: str, data: bytes):
        """Log encryption handshake data — the key to cracking the crypto."""
        entry = {
            "t": datetime.now().isoformat(),
            "char": label,
            "len": len(data),
            "hex": data.hex(),
        }
        self.crypto_log.append(entry)

        self.log_event("🔑", label, data)

        # Heuristic analysis
        if len(data) == 16:
            log.info(f"     🔑 16 bytes — POSSIBLE CHALLENGE / DEVICE KEY")
        elif len(data) == 32:
            log.info(f"     🔐 32 bytes — POSSIBLE AES BLOCK PAIR (2×16)")
        elif len(data) == 64:
            log.info(f"     📦 64 bytes — POSSIBLE FULL HANDSHAKE REQUEST")
        elif len(data) > 100:
            log.info(f"     📦 {len(data)} bytes — LARGE CRYPTO BLOB")

    # ─── Lifecycle ──────────────────────────────────────────────────

    def _on_connection(self, address: Optional[str]):
        if address:
            self.connected = True
            self.client_address = address
            log.info(f"\n{'=' * 72}")
            log.info(f"  🔗 CONNECTED: {address}")
            log.info(f"  Device: Go-tcha Classic (emulated)")
            log.info(f"{'=' * 72}")
        else:
            self.connected = False
            log.info(f"\n{'=' * 72}")
            log.info(f"  🔌 DISCONNECTED: {self.client_address or 'unknown'}")
            log.info(f"{'=' * 72}")
            self.client_address = None
            self.handshake_state = 0

    async def run(self):
        log.info(f"{'=' * 72}")
        log.info(f"  🧪 Go-tcha Classic Emulator — Handshake Logger")
        log.info(f"{'=' * 72}")
        log.info(f"  Profile:    Cloned from nRF Connect XML")
        log.info(f"  Services:   5 (Device Info, Battery, PGP, Auth, Encryption)")
        log.info(f"  Blob:       {len(CLONED_BLOB)}-byte encryption payload")
        log.info(f"  Log file:   {LOG_FILE}")
        log.info(f"{'=' * 72}")

        await self.build_server()
        await self.server.start()

        log.info(f"\n  ✅ Server started as 'Go-tcha Classic'")
        log.info(f"  ✅ Connect Pokemon Go to this device NOW!")
        log.info(f"  ✅ Press Ctrl+C to stop\n")

        # Handle shutdown
        stop = asyncio.Future()
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, lambda: stop.set_result(True))
            except NotImplementedError:
                # Windows: no signal handlers
                pass

        try:
            await stop
        except (asyncio.CancelledError, KeyboardInterrupt):
            pass

        await self.server.stop()

        # ─── Summary ────────────────────────────────────────────────
        log.info(f"\n{'=' * 72}")
        log.info(f"  📊 SESSION SUMMARY")
        log.info(f"{'=' * 72}")
        log.info(f"  Duration: {time.time() - self.start_time:.0f}s")
        log.info(f"  Connected: {'YES' if self.connected else 'NO'}")

        if self.crypto_log:
            log.info(f"\n  🔑 CRYPTO HAND SHAKE CAPTURE ({len(self.crypto_log)} writes):")
            log.info(f"  {'─' * 72}")
            for i, e in enumerate(self.crypto_log):
                log.info(f"  {i+1:2d}. {e['char']:8s} → {e['len']:3d}B: {e['hex'][:64]}")
                if len(e['hex']) > 64:
                    log.info(f"      {'':11s}{e['hex'][64:128]}")
            # Save crypto log as JSON too
            with open("gotcha_crypto_log.json", "w") as f:
                json.dump(self.crypto_log, f, indent=2)
            log.info(f"\n  💾 Crypto log saved to gotcha_crypto_log.json")
        else:
            log.info(f"  No crypto writes received — device connected but didn't authenticate.")

        log.info(f"\n  Full handshake log saved to: {LOG_FILE}")
        log.info(f"{'=' * 72}")


# ─── Main ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    emu = GotchaEmulator()
    asyncio.run(emu.run())
