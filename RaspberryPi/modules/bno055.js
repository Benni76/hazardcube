const i2c = require('i2c-bus');

// BNO055 default I2C address
const BNO055_I2C_ADDR = 0x28;

// BNO055 register addresses
const BNO055_CHIP_ID_ADDR = 0x00;
const BNO055_OPR_MODE_ADDR = 0x3D;
const BNO055_ACC_DATA_X_LSB_ADDR = 0x08;

// BNO055 operation modes
const BNO055_OPERATION_MODE_CONFIG = 0x00;
const BNO055_OPERATION_MODE_NDOF = 0x0C;

const busNumber = 1; // I2C bus number, usually 1 on Raspberry Pi

async function scanI2CBus() {
    const i2cBus = i2c.openSync(1);
    const availableAddresses = [];

    for (let addr = 0x03; addr <= 0x77; addr++) {
        try {
            i2cBus.readByteSync(addr, 0x00);
            availableAddresses.push(addr);
        } catch (e) {
            // Ignore errors, they indicate no device at this address
        }
    }

    i2cBus.closeSync();
    return availableAddresses;
}

async function initializeBNO055() {
    let addresses = await scanI2CBus();
    if(addresses.includes(40)) {
        try {
            const i2cBus = i2c.openSync(busNumber);

            // Check the chip ID
            const chipId = i2cBus.readByteSync(BNO055_I2C_ADDR, BNO055_CHIP_ID_ADDR);
            if (chipId !== 0xA0) {
                throw new Error(`Unexpected chip ID: 0x${chipId.toString(16)}`);
            }

            // Set to configuration mode
            i2cBus.writeByteSync(BNO055_I2C_ADDR, BNO055_OPR_MODE_ADDR, BNO055_OPERATION_MODE_CONFIG);

            // Set to NDOF mode
            i2cBus.writeByteSync(BNO055_I2C_ADDR, BNO055_OPR_MODE_ADDR, BNO055_OPERATION_MODE_NDOF);

            //console.log('BNO055 initialized and set to NDOF mode.');

            i2cBus.closeSync();
        } catch (error) {
            console.log('BNO055 initialization error:', error);
        }
    } else {
        return;
    }
}

async function readAcceleration() {
    let addresses = await scanI2CBus();
    if(addresses.includes(40)) {
        try {
            const i2cBus = i2c.openSync(busNumber);

            // Read the acceleration data registers (6 bytes)
            const buffer = Buffer.alloc(6);
            i2cBus.readI2cBlockSync(BNO055_I2C_ADDR, BNO055_ACC_DATA_X_LSB_ADDR, 6, buffer);

            // Convert the data to acceleration values (LSB)
            const accX = buffer.readInt16LE(0);
            const accY = buffer.readInt16LE(2);
            const accZ = buffer.readInt16LE(4);

            // Convert LSB to m/s² (1 LSB = 0.01 m/s²)
            const accX_mps2 = accX / 100.0;
            const accY_mps2 = accY / 100.0;
            const accZ_mps2 = accZ / 100.0;

            //console.log(`Acceleration X: ${accX_mps2.toFixed(2)} m/s²`);
            //console.log(`Acceleration Y: ${accY_mps2.toFixed(2)} m/s²`);
            //console.log(`Acceleration Z: ${accZ_mps2.toFixed(2)} m/s²`);
            i2cBus.closeSync();
            return { x: Number(accX_mps2.toFixed(2)), y: Number(accY_mps2.toFixed(2)), z: Number(accZ_mps2.toFixed(2)) }
        } catch (error) {
            console.log('BNO055 initialization error:', error);
        }
    } else {
        return { x: 0, y: 0, z: 0 }
    }
}


module.exports = { readAcceleration, initializeBNO055 }