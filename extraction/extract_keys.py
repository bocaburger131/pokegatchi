#!/usr/bin/env python3
"""
Gotcha Evolve / Pokemon Go Plus Key Extraction Script
=====================================================
Uses the SUOTA (Software Update Over-The-Air) exploit to read the
16-byte device key and 256-byte OTP blob from a Gotcha Evolve device.

No soldering required — works over BLE.

Usage:
    # Scan for devices
    python3 extract_keys.py scan

    # Extract keys from device (replace with actual MAC)
    python3 extract_keys.py extract XX:XX:XX:XX:XX:XX --output keys.json

    # Restore original firmware
    python3 extract_keys.py restore XX:XX:XX:XX:XX:XX --fw original.bin

Author: @whisperer for BocaBurger131
Based on: CoderJesus SUOTA exploit, Yohanes pgpemu, Spezifisch pgpemu fork
"""

import sys
import os
import json
import struct
import hashlib
import argparse
from typing import Optional, List

# ─── SUOTA Protocol Constants ───────────────────────────────────────

SUOTA_SERVICE_UUID = "0000fef5-0000-1000-8000-00805f9b34fb"

SPOTA_MEM_DEV_UUID      = "8082caa8-41a6-4021-91c6-56f9b954cc34"
SPOTA_GPIO_MAP_UUID     = "724249f0-5ec3-4b5f-8804-42345af08651"
SPOTA_MEM_INFO_UUID     = "6c53db25-47a1-45fe-a022-7c92fb334fd4"
SPOTA_PATCH_LEN_UUID    = "9d84b9a3-000c-49d8-9183-855b673fda31"
SPOTA_PATCH_DATA_UUID   = "457871e8-d516-4ca1-9116-57d0b17b9cb2"
SPOTA_SERV_STATUS_UUID  = "5f78df94-798c-46f5-990a-b3eb6a065c88"

# SPOTA_MEM_DEV commands
SPOTAR_MEM_INT_SYSRAM   = 0x00
SPOTAR_MEM_INT_RETRAM   = 0x01
SPOTAR_MEM_I2C_EEPROM   = 0x02
SPOTAR_MEM_SPI_FLASH    = 0x03
SPOTAR_IMG_INT_SYSRAM   = 0x10

# Status codes
SPOTA_STATUS_OK         = 0x00
SPOTA_STATUS_CRC_ERR    = 0x01
SPOTA_STATUS_PAT_ERR    = 0x02
SPOTA_STATUS_INT_ERR    = 0x03
SPOTA_STATUS_MEM_ERR    = 0x04

# ─── Custom Firmware (reads OTP and exposes via BLE) ────────────────

# This is the critical part — we need a patched firmware binary that:
# 1. Reads OTP at 0x47000 (blob, 256 bytes)
# 2. Reads OTP at 0x47120 (key, 16 bytes)
# 3. Exposes them as a readable BLE characteristic
#
# The SUOTA exploit uploads this firmware, we read the keys, then
# restore the original firmware.
#
# The actual .bin firmware needs to be compiled from the Dialog DA14580
# SDK. See the SUOTA_BOOTLOADER or a minimal firmware project.
# For now, this script handles the upload/download protocol.

# PGP Original firmware images (bank 1 and bank 2)
# These are the original firmware images from a genuine PGP/Gotcha device.
# Bank 1 = 0x08000, Bank 2 = 0x10000, Image size = 32048 bytes each.
PGP_FW_BANK1_ADDR = 0x08000
PGP_FW_BANK2_ADDR = 0x10000
PGP_FW_SIZE = 32048


# ─── BLE Client ─────────────────────────────────────────────────────

class BleClient:
    """Minimal BLE client using bleak library."""

    def __init__(self, debug: bool = False):
        self.debug = debug
        self.client = None

    async def scan(self, timeout: int = 10) -> List[dict]:
        """Scan for BLE devices, return list of SUOTA-capable devices."""
        from bleak import BleakScanner

        devices = []
        discovered = await BleakScanner.discover(timeout=timeout)

        for dev in discovered:
            name = dev.name or "Unknown"
            if any(kw in name.lower() for kw in ["gotcha", "pokemon", "pgp", "plus", "go-tcha", "go_tcha"]):
                devices.append({
                    "name": name,
                    "address": dev.address,
                    "rssi": dev.rssi,
                })
                if self.debug:
                    print(f"  Found: {name} ({dev.address}) RSSI: {dev.rssi}")

        return devices

    async def connect(self, address: str):
        """Connect to device by MAC address."""
        from bleak import BleakClient
        self.client = BleakClient(address, timeout=30.0)
        await self.client.connect()
        print(f"  Connected to {address}")

    async def disconnect(self):
        if self.client and self.client.is_connected:
            await self.client.disconnect()
            print("  Disconnected")

    async def read_char(self, uuid: str) -> bytearray:
        """Read a BLE characteristic."""
        data = await self.client.read_gatt_char(uuid)
        if self.debug:
            print(f"  Read {uuid}: {data.hex()}")
        return data

    async def write_char(self, uuid: str, data: bytes, response: bool = True):
        """Write to a BLE characteristic."""
        await self.client.write_gatt_char(uuid, data, response=response)
        if self.debug:
            print(f"  Wrote {uuid}: {data.hex()}")

    async def wait_for_notify(self, uuid: str, timeout: float = 10.0) -> bytearray:
        """Wait for a notification from a characteristic."""
        result = []

        def callback(sender, data):
            result.append(data)
            if self.debug:
                print(f"  Notify {uuid}: {data.hex()}")

        await self.client.start_notify(uuid, callback)

        import asyncio
        try:
            await asyncio.sleep(timeout)
        finally:
            await self.client.stop_notify(uuid)

        return result[0] if result else bytearray()


# ─── SUOTA Protocol Implementation ──────────────────────────────────

class SuotaProtocol:
    """Implements the SUOTA (Software Update Over-The-Air) protocol."""

    def __init__(self, ble: BleClient):
        self.ble = ble

    async def ping(self) -> bool:
        """Check if device is in SUOTA mode."""
        try:
            data = await self.ble.read_char(SPOTA_MEM_INFO_UUID)
            # Memory info available = device is ready
            return len(data) >= 4
        except Exception:
            return False

    async def set_mem_dev(self, mem_type: int, base_addr: int = 0):
        """Set memory device type for patching.
        
        mem_type: SPOTAR_MEM_INT_SYSRAM, SPOTAR_MEM_SPI_FLASH, etc.
        base_addr: Base address for the memory operation.
        """
        data = struct.pack("<II", base_addr, mem_type)
        await self.ble.write_char(SPOTA_MEM_DEV_UUID, data[:4])

    async def upload_patch_data(self, data: bytes, chunk_size: int = 20) -> bool:
        """Upload patch data to device.
        
        Data is sent in chunks of chunk_size bytes, followed by
        updating the patch length.
        """
        # Set total patch length
        patch_len = len(data)
        await self.ble.write_char(
            SPOTA_PATCH_LEN_UUID,
            struct.pack("<H", patch_len)
        )

        # Send data in chunks
        for offset in range(0, len(data), chunk_size):
            chunk = data[offset:offset + chunk_size]
            # Pad to 20 bytes if needed
            if len(chunk) < chunk_size:
                chunk = chunk + b'\x00' * (chunk_size - len(chunk))
            await self.ble.write_char(
                SPOTA_PATCH_DATA_UUID,
                chunk,
                response=False  # No response for data chunks
            )

            # Small delay to let device process
            import asyncio
            await asyncio.sleep(0.01)

        return True

    async def get_status(self) -> int:
        """Read the SUOTA service status."""
        data = await self.ble.read_char(SPOTA_SERV_STATUS_UUID)
        return data[0] if data else 0xFF

    async def wait_for_completion(self, timeout: float = 30.0) -> bool:
        """Wait for SUOTA operation to complete."""
        import asyncio
        start = asyncio.get_event_loop().time()

        while (asyncio.get_event_loop().time() - start) < timeout:
            status = await self.get_status()
            if status == SPOTA_STATUS_OK:
                return True
            elif status != 0xFF:  # Error
                print(f"  SUOTA error: status=0x{status:02x}")
                return False
            await asyncio.sleep(0.5)

        print("  SUOTA timeout")
        return False


# ─── Custom Firmware ────────────────────────────────────────────────

class PatchedFirmware:
    """Builds and manages the patched firmware for key extraction."""

    @staticmethod
    def build_key_extraction_fw() -> bytes:
        """Build a minimal firmware that reads and exposes OTP keys.
        
        This firmware:
        1. Initializes BLE with a characteristic to read keys
        2. Reads OTP at 0x47000 (blob) and 0x47120 (key)
        3. Exposes 272 bytes via a custom characteristic
        
        NOTE: This requires compiling from the Dialog SDK.
        For now, this returns a placeholder — you need to compile
        the actual firmware from the SUOTA_EXTRACT project.
        
        See: https://github.com/da14580/suota_extract (example)
        """
        raise NotImplementedError(
            "Custom firmware must be compiled from the Dialog DA14580 SDK.\n"
            "See the suota_extract_fw/ directory for the firmware source.\n\n"
            "Quick start:\n"
            "  1. Install Dialog SmartSnippets Toolbox\n"
            "  2. Open suota_extract_fw/KEIL_Project/ in Keil uVision\n"
            "  3. Build -> produces suota_extract.bin\n"
            "  4. Pass to this script with --patch-fw suota_extract.bin"
        )

    @staticmethod
    def load_binary(path: str) -> bytes:
        """Load a pre-built firmware binary."""
        with open(path, 'rb') as f:
            return f.read()

    @staticmethod
    def prepare_suota_image(fw_data: bytes, image_id: int = 0x02) -> bytes:
        """Prepare a SUOTA-compatible firmware image with header.
        
        SUOTA image header format:
        - Signature: 0x7051 (2 bytes)
        - Valid flag: 0xAA (1 byte)
        - Image ID: 1 byte
        - Image size: 4 bytes
        - CRC: 4 bytes
        - Version: 16 bytes
        - Timestamp: 4 bytes
        - Encryption flag: 1 byte
        - Reserved: 31 bytes
        Total header: 64 bytes
        """
        header = bytearray(64)

        # Signature
        struct.pack_into("<H", header, 0, 0x7051)
        # Valid flag
        header[2] = 0xAA
        # Image ID
        header[3] = image_id
        # Image size
        struct.pack_into("<I", header, 4, len(fw_data))
        # CRC (we'll use SHA1 truncated to 32 bits for simplicity)
        crc = hashlib.sha1(fw_data).digest()[:4]
        header[8:12] = crc
        # Version string
        version = b"3.900.1.115r1\x00"
        header[12:28] = version.ljust(16, b'\x00')
        # Timestamp
        struct.pack_into("<I", header, 28, 0x5565E640)  # May 28, 2015
        # Encryption flag
        header[32] = 0x00  # Not encrypted

        return bytes(header) + fw_data


# ─── Main Extraction Flow ───────────────────────────────────────────

async def scan_for_devices():
    """Scan for Gotcha/PGP devices."""
    from bleak import BleakScanner
    print("Scanning for Pokemon Go Plus / Gotcha devices...")
    print("Make sure your Gotcha Evolve is in pairing mode.")
    print()

    ble = BleClient(debug=True)
    devices = await ble.scan(timeout=15)

    if not devices:
        print("No devices found.")
        print()
        print("Tips:")
        print("  1. Put your Gotcha Evolve in pairing mode")
        print("     (hold the button until it vibrates/flashes)")
        print("  2. Make sure Bluetooth is enabled on this computer")
        print("  3. Try scanning with: python3 extract_keys.py scan")
        return

    print(f"\nFound {len(devices)} device(s):")
    for i, dev in enumerate(devices):
        print(f"  [{i}] {dev['name']}  ({dev['address']})  RSSI: {dev['rssi']}")


async def extract_keys(mac_address: str, output: str, patch_fw: Optional[str] = None):
    """Extract device key and OTP blob from a Gotcha Evolve."""
    print(f"=== Key Extraction from {mac_address} ===")
    print()

    # 1. Connect
    print("[1/6] Connecting to device...")
    ble = BleClient(debug=True)
    await ble.connect(mac_address)
    print()

    # 2. Check if device supports SUOTA
    print("[2/6] Checking SUOTA support...")
    suota = SuotaProtocol(ble)
    if await suota.ping():
        print("  ✓ SUOTA supported")
    else:
        print("  ✗ SUOTA not available on this device")
        print("  Try: Is this a genuine Pokemon Go Plus or Gotcha Evolve?")
        print("  Note: Original Gotcha devices DO support SUOTA.")
        await ble.disconnect()
        return
    print()

    # 3. Upload patched firmware via SUOTA
    print("[3/6] Uploading patched firmware...")

    if patch_fw:
        fw_data = PatchedFirmware.load_binary(patch_fw)
    else:
        # Try to build it
        try:
            fw_data = PatchedFirmware.build_key_extraction_fw()
        except NotImplementedError as e:
            print(f"  {e}")
            print()
            print("  What you need to do:")
            print("  1. Set up the Dialog DA14580 SDK + Keil uVision")
            print("  2. Build the firmware from suota_extract_fw/")
            print("  3. Pass the .bin file to this script:")
            print("     python3 extract_keys.py extract MAC --patch-fw my_fw.bin")
            await ble.disconnect()
            return

    # Prepare SUOTA image
    suota_image = PatchedFirmware.prepare_suota_image(fw_data)

    # Upload
    await suota.set_mem_dev(SPOTAR_MEM_SPI_FLASH, PGP_FW_BANK1_ADDR)
    await suota.upload_patch_data(suota_image)
    success = await suota.wait_for_completion(timeout=30.0)

    if not success:
        print("  ✗ Firmware upload failed!")
        await ble.disconnect()
        return

    print("  ✓ Patched firmware uploaded successfully")
    print()

    # 4. Reconnect to device (it reboots with new firmware)
    print("[4/6] Reconnecting to patched device...")
    await ble.disconnect()

    import asyncio
    await asyncio.sleep(3.0)  # Wait for reboot

    await ble.connect(mac_address)
    print()

    # 5. Read keys
    print("[5/6] Reading keys...")
    try:
        # The patched firmware exposes keys via a custom characteristic
        # UUID: 0000fef6-0000-1000-8000-00805f9b34fb (example)
        KEY_CHAR_UUID = "0000fef6-0000-1000-8000-00805f9b34fb"

        key_data = await ble.read_char(KEY_CHAR_UUID)
        print(f"  Read {len(key_data)} bytes")

        if len(key_data) >= 272:
            device_key = bytes(key_data[:16])
            otp_blob = bytes(key_data[16:272])

            print()
            print(f"  ✓ Device Key: {device_key.hex()}")
            print(f"  ✓ OTP Blob:   {otp_blob[:32].hex()}... ({len(otp_blob)} bytes)")
            print()

            # Save to JSON
            result = {
                "device_key": device_key.hex(),
                "otp_blob": otp_blob.hex(),
                "mac_address": mac_address,
                "extracted_at": __import__('datetime').datetime.now().isoformat(),
            }

            with open(output, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"  Keys saved to: {output}")

            # Also save raw binary for firmware
            raw_output = output.replace('.json', '.bin')
            with open(raw_output, 'wb') as f:
                f.write(device_key + otp_blob)
            print(f"  Raw keys saved to: {raw_output}")

        else:
            print(f"  ✗ Unexpected data length: {len(key_data)} bytes")
            print(f"  Raw data: {key_data.hex()}")

    except Exception as e:
        print(f"  ✗ Failed to read keys: {e}")
        print("  The patched firmware may not be exposing the key characteristic.")
    print()

    # 6. Restore original firmware (optional)
    # This would re-upload the original PGP firmware
    print("[6/6] Done. Device will need original firmware restored before normal use.")
    print("  Use: python3 extract_keys.py restore MAC --fw original.bin")

    await ble.disconnect()


async def restore_firmware(mac_address: str, fw_path: str):
    """Restore original firmware to the device."""
    print(f"=== Restoring Firmware to {mac_address} ===")
    print()

    if not os.path.exists(fw_path):
        print(f"  ✗ Firmware file not found: {fw_path}")
        return

    fw_data = PatchedFirmware.load_binary(fw_path)
    suota_image = PatchedFirmware.prepare_suota_image(fw_data)

    print(f"  Loading firmware: {fw_path} ({len(suota_image)} bytes)")

    ble = BleClient(debug=True)
    await ble.connect(mac_address)

    suota = SuotaProtocol(ble)
    await suota.set_mem_dev(SPOTAR_MEM_SPI_FLASH, PGP_FW_BANK1_ADDR)
    await suota.upload_patch_data(suota_image)
    success = await suota.wait_for_completion()

    if success:
        print("  ✓ Firmware restored successfully!")
        print("  Your device is back to normal.")
    else:
        print("  ✗ Firmware restore failed.")

    await ble.disconnect()


# ─── CLI ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Gotcha Evolve / Pokemon Go Plus Key Extraction Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Scan for nearby Gotcha devices
    python3 extract_keys.py scan

    # Extract keys from a device
    python3 extract_keys.py extract AA:BB:CC:DD:EE:FF --output my_keys.json

    # Extract with custom patched firmware
    python3 extract_keys.py extract AA:BB:CC:DD:EE:FF --patch-fw custom_fw.bin

    # Restore original firmware
    python3 extract_keys.py restore AA:BB:CC:DD:EE:FF --fw original_fw.bin
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command")

    # Scan
    scan_parser = subparsers.add_parser("scan", help="Scan for devices")

    # Extract
    extract_parser = subparsers.add_parser("extract", help="Extract keys from device")
    extract_parser.add_argument("mac", help="Device MAC address")
    extract_parser.add_argument("--output", "-o", default="keys.json", help="Output file")
    extract_parser.add_argument("--patch-fw", help="Patched firmware binary")

    # Restore
    restore_parser = subparsers.add_parser("restore", help="Restore original firmware")
    restore_parser.add_argument("mac", help="Device MAC address")
    restore_parser.add_argument("--fw", required=True, help="Original firmware binary")

    args = parser.parse_args()

    if args.command == "scan":
        import asyncio
        asyncio.run(scan_for_devices())

    elif args.command == "extract":
        import asyncio
        asyncio.run(extract_keys(args.mac, args.output, args.patch_fw))

    elif args.command == "restore":
        import asyncio
        asyncio.run(restore_firmware(args.mac, args.fw))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
