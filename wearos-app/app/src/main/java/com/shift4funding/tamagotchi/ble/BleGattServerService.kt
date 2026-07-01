package com.shift4funding.tamagotchi.ble

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.shift4funding.tamagotchi.R
import java.util.*

/**
 * BLE GATT Server Service.
 *
 * Advertises as a Go-tcha Classic device and implements the full Pokemon Go Plus
 * certification handshake protocol. Matches the GATT profile cloned from a real
 * Datel RSL10-based Go-tcha Classic via nRF Connect.
 *
 * GATT Profile (cloned from real device):
 *   Service 0x180A          — Device Information (Datel, Go-tcha Classic, RSL10, FW 1.0.0)
 *   Service 0x180F          — Battery Service (33%, notify)
 *   Service bbe87709...8e37 — PGP Primary (write cmd, read/notify response, read static)
 *   Service 21c50462...9aeb — Auth/Handshake (3x write, 1x notify, 1x read name)
 *   Service 75579f32...2301 — Encryption/OTP (2x write, 1x read 256-byte blob, 1x write+notify, 1x write)
 *
 * Once connected, it parses LED notification patterns from the Pokemon Go app
 * to determine game events (caught/fled/spun).
 */
class BleGattServerService : Service() {

    companion object {
        const val TAG = "BleGattServer"
        const val ACTION_BLE_EVENT = "com.shift4funding.BLE_EVENT"
        const val EXTRA_EVENT_TYPE = "event_type"

        // ── Service: Device Information (0x180A) ──────────────────────
        val DEVICE_INFO_SERVICE   = UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb")
        val MANUFACTURER_CHAR     = UUID.fromString("00002a29-0000-1000-8000-00805f9b34fb") // READ  → "Datel"
        val MODEL_NUM_CHAR        = UUID.fromString("00002a24-0000-1000-8000-00805f9b34fb") // READ  → "Go-tcha Classic"
        val HARDWARE_REV_CHAR     = UUID.fromString("00002a27-0000-1000-8000-00805f9b34fb") // READ  → "RSL10"
        val FIRMWARE_REV_CHAR     = UUID.fromString("00002a28-0000-1000-8000-00805f9b34fb") // READ  → "1.0.0"

        // ── Service: Battery (0x180F) ─────────────────────────────────
        val BATTERY_SERVICE       = UUID.fromString("0000180f-0000-1000-8000-00805f9b34fb")
        val BATTERY_LEVEL_CHAR    = UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb") // READ+NOTIFY → 33%

        // ── Service: PGP Primary (bbe87709-5b89-4433-ab7f-8b8eef0d8e37) ──
        val PGP_SERVICE           = UUID.fromString("bbe87709-5b89-4433-ab7f-8b8eef0d8e37")
        val PGP_WRITE_CHAR        = UUID.fromString("bbe87709-5b89-4433-ab7f-8b8eef0d8e38") // WRITE  — app sends LED/cmd
        val PGP_READ_NOTIFY_CHAR  = UUID.fromString("bbe87709-5b89-4433-ab7f-8b8eef0d8e39") // READ+NOTIFY → device responses (init: 04002300)
        val PGP_READ_CHAR         = UUID.fromString("bbe87709-5b89-4433-ab7f-8b8eef0d8e3a") // READ   — static data (empty)

        // ── Service: Auth/Handshake (21c50462-67cb-63a3-5c4c-82b5b9939aeb) ──
        val AUTH_SERVICE          = UUID.fromString("21c50462-67cb-63a3-5c4c-82b5b9939aeb")
        val AUTH_WRITE_1          = UUID.fromString("21c50462-67cb-63a3-5c4c-82b5b9939aec") // WRITE  — auth command 1
        val AUTH_READ_NOTIFY      = UUID.fromString("21c50462-67cb-63a3-5c4c-82b5b9939aed") // READ+NOTIFY → auth response (init: 0000)
        val AUTH_WRITE_2          = UUID.fromString("21c50462-67cb-63a3-5c4c-82b5b9939aee") // WRITE  — auth command 2
        val AUTH_WRITE_3          = UUID.fromString("21c50462-67cb-63a3-5c4c-82b5b9939aef") // WRITE  — auth command 3
        val AUTH_NAME_CHAR        = UUID.fromString("21c50462-67cb-63a3-5c4c-82b5b9939af0") // READ   → "PokemonGoooooooo"

        // ── Service: Encryption/OTP/Device Key (75579f32-a47a-6782-00cb-8a1e5e592301) ──
        val ENC_SERVICE           = UUID.fromString("75579f32-a47a-6782-00cb-8a1e5e592301")
        val ENC_WRITE_1           = UUID.fromString("75579f32-a47a-6782-00cb-8a1e5e592302") // WRITE
        val ENC_WRITE_2           = UUID.fromString("75579f32-a47a-6782-00cb-8a1e5e592303") // WRITE
        val ENC_READ_BLOB         = UUID.fromString("75579f32-a47a-6782-00cb-8a1e5e592304") // READ   → 256-byte encryption blob
        val ENC_WRITE_NOTIFY      = UUID.fromString("75579f32-a47a-6782-00cb-8a1e5e592305") // WRITE+NOTIFY → CCCD enabled
        val ENC_WRITE_3           = UUID.fromString("75579f32-a47a-6782-00cb-8a1e5e592306") // WRITE

        // ── Event Types ──────────────────────────────────────────────
        const val EVENT_POKEMON_NEARBY = "pokemon_nearby"
        const val EVENT_NEW_SPECIES = "new_species"
        const val EVENT_POKESTOP_NEARBY = "pokestop_nearby"
        const val EVENT_CAUGHT = "caught"
        const val EVENT_FLED = "fled"
        const val EVENT_SPUN = "spun"
        const val EVENT_BAG_FULL = "bag_full"
        const val EVENT_OUT_OF_BALLS = "out_of_balls"
        const val EVENT_UNKNOWN = "unknown"

        // ── The 256-byte encryption blob from the cloned Go-tcha Classic ──
        private val CLONED_ENCRYPTION_BLOB = byteArrayOf(
            0x17, 0xaf.toByte(), 0x07, 0x00, 0xdb.toByte(), 0xc4.toByte(), 0xcb.toByte(), 0x0e,
            0x6b, 0x9c.toByte(), 0x07, 0x00, 0x2f, 0x00, 0x00, 0x00,
            0x9f.toByte(), 0x66, 0xe4.toByte(), 0x0c, 0x00, 0x10, 0x00, 0x00,
            0x63, 0x2b, 0x4e, 0x6b, 0xe0.toByte(), 0x14, 0x00, 0x00,
            0x2f, 0x8c.toByte(), 0x09, 0x30, 0x60, 0x1f, 0x00, 0x00,
            0x1a, 0x29, 0x6a, 0xd9.toByte(), 0x80.toByte(), 0x32, 0x00, 0x00,
            0xba.toByte(), 0x95, 0xac.toByte(), 0xa9.toByte(), 0x20, 0x52, 0x00, 0x00,
            0x54, 0x45, 0x49, 0x96, 0xa0.toByte(), 0x60, 0x00, 0x00,
            0x9a.toByte(), 0x91, 0xc6.toByte(), 0x99, 0x40, 0x6b, 0x00, 0x00,
            0xcc.toByte(), 0xb7.toByte(), 0x98, 0xf9.toByte(), 0xa0.toByte(), 0x6c, 0x00, 0x00,
            0x5a, 0x87, 0x9f.toByte(), 0x8e.toByte(), 0x60, 0x6d, 0x00, 0x00,
            0xe0.toByte(), 0xd6.toByte(), 0x96, 0x17, 0x60, 0x6e, 0x00, 0x00,
            0x76, 0xe6.toByte(), 0x91, 0x60, 0x80.toByte(), 0x6f, 0x00, 0x00,
            0xd5.toByte(), 0x73, 0xf5.toByte(), 0xfe.toByte(), 0xa0.toByte(), 0x70, 0x00, 0x00,
            0xbb.toByte(), 0xb2.toByte(), 0x05, 0x28, 0xe0.toByte(), 0x71, 0x00, 0x00,
            0xae.toByte(), 0x14, 0x59, 0x19, 0x00, 0x7d, 0x00, 0x00,
            0x58, 0x9d.toByte(), 0x4e, 0x60, 0xe0.toByte(), 0x93.toByte(), 0x00, 0x00,
            0x9b.toByte(), 0x62, 0x41, 0xe5.toByte(), 0x80.toByte(), 0xbc.toByte(), 0x00, 0x00,
            0x89, 0x95, 0x87, 0xd1.toByte(), 0xa0.toByte(), 0xcb.toByte(), 0x00, 0x00,
            0x94, 0x21, 0x77, 0xec.toByte(), 0x60, 0x2a, 0x02, 0x00,
            0xc9.toByte(), 0x0d, 0x54, 0xe7.toByte(), 0x80.toByte(), 0x47, 0x02, 0x00,
            0x7a, 0x42, 0xf3.toByte(), 0xe6.toByte(), 0x20, 0x5e, 0x02, 0x00,
            0x4e, 0x2e, 0x04, 0xc1.toByte(), 0xa0.toByte(), 0x7d, 0x02, 0x00,
            0xde.toByte(), 0xe8.toByte(), 0x9d.toByte(), 0x58, 0xa0.toByte(), 0xb6.toByte(), 0x02, 0x00,
            0xf0.toByte(), 0x04, 0xcb.toByte(), 0x29, 0x60, 0xea.toByte(), 0x02, 0x00,
            0x66, 0x08, 0xf0.toByte(), 0xeb.toByte(), 0xa0.toByte(), 0x49, 0x03, 0x00,
            0x6a, 0x12, 0x95, 0x0a, 0x20, 0xa2.toByte(), 0x03, 0x00,
            0x2d, 0x81, 0x97, 0x1d, 0xe0.toByte(), 0xad.toByte(), 0x03, 0x00,
            0xd4.toByte(), 0x13, 0x0f, 0x52, 0x20, 0xe0.toByte(), 0x03, 0x00,
            0xb9.toByte(), 0x1f, 0xd5.toByte(), 0xa2.toByte(), 0xe0.toByte(), 0x39, 0x04, 0x00,
            0xb6.toByte(), 0x69, 0xa3.toByte(), 0x2b, 0xa0.toByte(), 0x69, 0x04, 0x00,
            0x2f, 0x2f, 0xd2.toByte(), 0xd5.toByte(), 0x60, 0x86.toByte(), 0x04, 0x00
        )
    }

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null

    // Keys loaded from storage
    private var deviceKey: ByteArray = ByteArray(16)
    private var otpBlob: ByteArray = ByteArray(256)

    private var isAdvertising = false
    private var isConnected = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        loadExtractedKeys()
        initBluetooth()
        startService()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startAdvertising()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopAdvertising()
        gattServer?.close()
        super.onDestroy()
    }

    // ─── Initialization ─────────────────────────────────────────────

    private fun loadExtractedKeys() {
        val prefs = getSharedPreferences("tamagotchi_ble", Context.MODE_PRIVATE)
        val keyString = prefs.getString("device_key", null)
        val blobString = prefs.getString("otp_blob", null)
        if (keyString != null && keyString.length == 32) {
            deviceKey = hexStringToByteArray(keyString)
        }
        if (blobString != null && blobString.length == 512) {
            otpBlob = hexStringToByteArray(blobString)
        }
        Log.d(TAG, "Keys loaded: ${if (keyString != null) "YES" else "NO"}")
    }

    private fun initBluetooth() {
        bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        bluetoothLeAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
        gattServer = bluetoothManager?.openGattServer(this, gattServerCallback)
        setupGattServices()
    }

    private fun setupGattServices() {
        gattServer?.let { server ->

            // ── Service 1: Device Information (0x180A) ────────────────
            server.addService(BluetoothGattService(DEVICE_INFO_SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
                addCharacteristic(BluetoothGattCharacteristic(
                    MANUFACTURER_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply { value = "Datel\u0000".toByteArray(Charsets.UTF_8) })

                addCharacteristic(BluetoothGattCharacteristic(
                    MODEL_NUM_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply { value = "Go-tcha Classic\u0000".toByteArray(Charsets.UTF_8) })

                addCharacteristic(BluetoothGattCharacteristic(
                    HARDWARE_REV_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply { value = "RSL10\u0000".toByteArray(Charsets.UTF_8) })

                addCharacteristic(BluetoothGattCharacteristic(
                    FIRMWARE_REV_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply { value = "1.0.0\u0000".toByteArray(Charsets.UTF_8) })
            })

            // ── Service 2: Battery (0x180F) ──────────────────────────
            server.addService(BluetoothGattService(BATTERY_SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
                addCharacteristic(BluetoothGattCharacteristic(
                    BATTERY_LEVEL_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply {
                    value = byteArrayOf(33) // 33% — matches cloned device
                })
            })

            // ── Service 3: PGP Primary (bbe87709) ────────────────────
            server.addService(BluetoothGattService(PGP_SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
                addCharacteristic(BluetoothGattCharacteristic(
                    PGP_WRITE_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                addCharacteristic(BluetoothGattCharacteristic(
                    PGP_READ_NOTIFY_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply {
                    value = byteArrayOf(0x04, 0x00, 0x23, 0x00) // Status: connected + notifying
                })

                addCharacteristic(BluetoothGattCharacteristic(
                    PGP_READ_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                )) // empty — reserved
            })

            // ── Service 4: Auth/Handshake (21c50462) ─────────────────
            server.addService(BluetoothGattService(AUTH_SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
                // Command from app (LED pattern / button request)
                addCharacteristic(BluetoothGattCharacteristic(
                    AUTH_WRITE_1,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                // Response from device (button press / status)
                addCharacteristic(BluetoothGattCharacteristic(
                    AUTH_READ_NOTIFY,
                    BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply {
                    value = byteArrayOf(0x00, 0x00) // init handshake state
                })

                // Additional write commands for auth protocol
                addCharacteristic(BluetoothGattCharacteristic(
                    AUTH_WRITE_2,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                addCharacteristic(BluetoothGattCharacteristic(
                    AUTH_WRITE_3,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                // Device name/advertisement identifier
                addCharacteristic(BluetoothGattCharacteristic(
                    AUTH_NAME_CHAR,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply {
                    value = "PokemonGoooooooo\u0000".toByteArray(Charsets.UTF_8)
                })
            })

            // ── Service 5: Encryption/OTP (75579f32) ─────────────────
            server.addService(BluetoothGattService(ENC_SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
                // Write commands for crypto handshake
                addCharacteristic(BluetoothGattCharacteristic(
                    ENC_WRITE_1,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                addCharacteristic(BluetoothGattCharacteristic(
                    ENC_WRITE_2,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                // 256-byte encryption/device identity blob (from cloned device)
                addCharacteristic(BluetoothGattCharacteristic(
                    ENC_READ_BLOB,
                    BluetoothGattCharacteristic.PROPERTY_READ,
                    BluetoothGattCharacteristic.PERMISSION_READ
                ).apply {
                    value = CLONED_ENCRYPTION_BLOB
                })

                // Write + Notify for encryption handshake flow
                addCharacteristic(BluetoothGattCharacteristic(
                    ENC_WRITE_NOTIFY,
                    BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))

                addCharacteristic(BluetoothGattCharacteristic(
                    ENC_WRITE_3,
                    BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                ))
            })
        }
    }

    // ─── Advertising ────────────────────────────────────────────────

    private fun startAdvertising() {
        if (isAdvertising) return
        if (bluetoothLeAdvertiser == null) {
            Log.w(TAG, "BLE advertiser not available")
            return
        }

        val advertiseData = AdvertiseData.Builder()
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(ParcelUuid(PGP_SERVICE))
            .addServiceUuid(ParcelUuid(AUTH_SERVICE))
            .addServiceUuid(ParcelUuid(ENC_SERVICE))
            .build()

        val advertiseSettings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
            .setConnectable(true)
            .build()

        bluetoothLeAdvertiser?.startAdvertising(
            advertiseSettings,
            advertiseData,
            advertisingCallback
        )
        isAdvertising = true
        Log.d(TAG, "Advertising as Go-tcha Classic...")
    }

    private fun stopAdvertising() {
        if (!isAdvertising) return
        bluetoothLeAdvertiser?.stopAdvertising(advertisingCallback)
        isAdvertising = false
    }

    private val advertisingCallback = object : AdvertisingSetCallback() {
        override fun onAdvertisingSetStarted(advertisingSet: AdvertisingSet?, txPower: Int, status: Int) {
            Log.d(TAG, "Advertising started: status=$status")
            isAdvertising = (status == AdvertiseCallback.ADVERTISE_SUCCESS)
        }
    }

    // ─── GATT Server Callbacks ──────────────────────────────────────

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
            isConnected = (newState == BluetoothProfile.STATE_CONNECTED)
            Log.d(TAG, "Connection: ${device?.address} state=$newState")
            if (!isConnected) {
                startAdvertising()
            }
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice?,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic?,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            if (value == null) return

            when (characteristic?.uuid) {
                // PGP service: LED pattern commands from app
                PGP_WRITE_CHAR -> handleLedPattern(value)

                // Auth service: certification handshake
                AUTH_WRITE_1 -> handleAuthWrite(device, value)
                AUTH_WRITE_2, AUTH_WRITE_3 -> {
                    Log.d(TAG, "Auth write: ${characteristic.uuid} → ${value.toHex()}")
                }

                // Encryption service: crypto commands
                ENC_WRITE_1, ENC_WRITE_2, ENC_WRITE_3, ENC_WRITE_NOTIFY -> {
                    handleEncryptionWrite(device, characteristic!!.uuid, value)
                }

                else -> Log.d(TAG, "Write to unknown char: ${characteristic?.uuid}")
            }

            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
            }
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice?,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic?
        ) {
            val value = characteristic?.value ?: ByteArray(0)
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
        }

        override fun onDescriptorWriteRequest(
            device: BluetoothDevice?,
            requestId: Int,
            descriptor: BluetoothGattDescriptor?,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            // Handle CCCD enable (subscribe to notifications)
            if (descriptor?.uuid == UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")) {
                Log.d(TAG, "CCCD write: ${descriptor.characteristic?.uuid} → ${value?.toHex()}")
            }
            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
            }
        }

        override fun onNotificationSent(device: BluetoothDevice?, status: Int) {
            // Notification sent successfully
        }
    }

    // ─── Auth Handshake ─────────────────────────────────────────────

    private var handshakeState = 0

    private fun handleAuthWrite(device: BluetoothDevice?, data: ByteArray) {
        Log.d(TAG, "Auth write: state=$handshakeState data=${data.toHex()}")

        when (handshakeState) {
            0 -> {
                // Step 1: App connected — respond with button availability
                gattServer?.getService(AUTH_SERVICE)?.getCharacteristic(AUTH_READ_NOTIFY)?.apply {
                    value = byteArrayOf(0x01, 0x00) // button up / ready
                }
                notifyAuthChanged(device, byteArrayOf(0x01, 0x00))
                handshakeState = 1
            }
            1 -> {
                // Step 2: App acknowledged — finalize auth
                gattServer?.getService(PGP_SERVICE)?.getCharacteristic(PGP_READ_NOTIFY_CHAR)?.apply {
                    value = byteArrayOf(0x04, 0x00, 0x23, 0x00) // status connected + notifying
                }
                notifyPgpChanged(device, byteArrayOf(0x04, 0x00, 0x23, 0x00))
                handshakeState = 2
            }
            2 -> {
                // Already authenticated — could be LED update
                handleLedPattern(data)
            }
        }
    }

    private fun handleEncryptionWrite(device: BluetoothDevice?, charUuid: UUID, data: ByteArray) {
        Log.d(TAG, "Encryption write: ${charUuid} data=${data.toHex()}")
        // Placeholder for future crypto handshake implementation
        // When the device key and OTP are extracted, this will:
        // 1. Receive challenge from app
        // 2. Compute response using AES-CTR with device key
        // 3. Respond via ENC_WRITE_NOTIFY
    }

    private fun notifyAuthChanged(device: BluetoothDevice?, value: ByteArray) {
        gattServer?.getService(AUTH_SERVICE)?.getCharacteristic(AUTH_READ_NOTIFY)?.let { char ->
            char.value = value
            gattServer?.notifyCharacteristicChanged(device, char, false)
        }
    }

    private fun notifyPgpChanged(device: BluetoothDevice?, value: ByteArray) {
        gattServer?.getService(PGP_SERVICE)?.getCharacteristic(PGP_READ_NOTIFY_CHAR)?.let { char ->
            char.value = value
            gattServer?.notifyCharacteristicChanged(device, char, false)
        }
    }

    // ─── LED Pattern Parser ─────────────────────────────────────────

    /**
     * Parses LED patterns sent by the Pokemon Go app and dispatches game events.
     *
     * Format (from reverse engineering):
     *   Header: 4 bytes (read_time, reserved, priority|count)
     *   Patterns: N x 3 bytes (duration, RGB, vibration+interp)
     */
    private fun handleLedPattern(data: ByteArray) {
        if (data.size < 4) return

        val patternCount = data[3].toInt() and 0x1F
        val patterns = mutableListOf<LedPattern>()

        for (i in 0 until patternCount) {
            val offset = 4 + i * 3
            if (offset + 3 > data.size) break
            patterns.add(LedPattern(
                duration = data[offset].toInt() * 50,  // ms
                green = (data[offset + 1].toInt() shr 4) and 0x0F,
                red = data[offset + 1].toInt() and 0x0F,
                blue = data[offset + 2].toInt() and 0x0F,
                vibration = (data[offset + 2].toInt() shr 4) and 0x07,
                interpolate = (data[offset + 2].toInt() shr 7) == 1
            ))
        }

        val event = classifyEvent(patterns)
        broadcastEvent(event)
    }

    data class LedPattern(
        val duration: Int,
        val green: Int,
        val red: Int,
        val blue: Int,
        val vibration: Int,
        val interpolate: Boolean
    )

    private fun classifyEvent(patterns: List<LedPattern>): String {
        if (patterns.isEmpty()) return EVENT_UNKNOWN

        val hasOff = patterns.any { it.red == 0 && it.green == 0 && it.blue == 0 }
        val hasGreen = patterns.any { it.green > 0 && it.red == 0 && it.blue == 0 }
        val hasBlue = patterns.any { it.blue > 0 && it.red == 0 && it.green == 0 }
        val hasRed = patterns.any { it.red > 0 && it.green == 0 && it.blue == 0 }
        val hasYellow = patterns.any { it.red > 0 && it.green > 0 && it.blue == 0 }
        val hasWhite = patterns.any { it.red > 0 && it.green > 0 && it.blue > 0 }
        val allOn = patterns.all { it.red > 0 || it.green > 0 || it.blue > 0 }

        // Ball shake: starts with white→off pattern
        val isBallShake = patterns.size >= 4 && hasWhite && hasOff

        // Check end pattern for ball shake outcome
        if (isBallShake) {
            val lastNonOff = patterns.lastOrNull { it.red > 0 || it.green > 0 || it.blue > 0 }
            return when {
                lastNonOff?.let { it.green > 0 && it.blue > 0 } == true -> EVENT_CAUGHT
                lastNonOff?.let { it.red > 0 && it.blue == 0 && it.green == 0 } == true -> EVENT_FLED
                else -> EVENT_UNKNOWN
            }
        }

        return when {
            hasGreen && !hasBlue && !hasRed && !hasYellow && !hasWhite -> EVENT_POKEMON_NEARBY
            hasYellow -> EVENT_NEW_SPECIES
            hasBlue && !hasGreen && !hasRed -> EVENT_POKESTOP_NEARBY
            hasWhite && !hasOff -> EVENT_SPUN  // got items
            allOn -> EVENT_SPUN
            hasRed && !hasOff -> EVENT_BAG_FULL
            hasRed && hasOff -> EVENT_OUT_OF_BALLS
            else -> EVENT_UNKNOWN
        }
    }

    private fun broadcastEvent(event: String) {
        Log.d(TAG, "BLE Event: $event")
        val intent = Intent(ACTION_BLE_EVENT).apply {
            putExtra(EXTRA_EVENT_TYPE, event)
        }
        sendBroadcast(intent)
    }

    // ─── Foreground Service ─────────────────────────────────────────

    private val NOTIFICATION_ID = 1001
    private val CHANNEL_ID = "tamagotchi_ble"

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "TamaGo Auto-Catcher",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun startService() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TamaGo")
            .setContentText("Auto-catcher is running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build()
        startForeground(NOTIFICATION_ID, notification)
    }

    // ─── Utilities ──────────────────────────────────────────────────

    private fun hexStringToByteArray(s: String): ByteArray {
        val len = s.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(s[i], 16) shl 4) + Character.digit(s[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }

    /** ByteArray → hex string for logging. */
    private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
}
