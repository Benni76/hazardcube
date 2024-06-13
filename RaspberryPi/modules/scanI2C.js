const i2c = require('i2c-bus');
var rpio = require('rpio');
rpio.open(40, rpio.OUTPUT, rpio.LOW);

// Function to scan the I2C bus
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

// Function to detect new I2C devices
function detectNewDevices(previousAddresses, currentAddresses) {
    return currentAddresses.filter(addr => !previousAddresses.includes(addr));
}

// Function to detect removed I2C devices
function detectRemovedDevices(previousAddresses, currentAddresses) {
    return previousAddresses.filter(addr => !currentAddresses.includes(addr));
}

// Main function to periodically check for new and removed devices
async function monitorI2CDevices(interval = 5000) {
    let knownAddresses = await scanI2CBus();
    console.log('Initial devices:', knownAddresses);

    setInterval(async () => {
        const currentAddresses = await scanI2CBus();
        const newDevices = detectNewDevices(knownAddresses, currentAddresses);
        const removedDevices = detectRemovedDevices(knownAddresses, currentAddresses);

        if (newDevices.length > 0) {
            console.log('New devices detected:', newDevices);
            knownAddresses = [...knownAddresses, ...newDevices];
            rpio.write(40, rpio.HIGH);
            rpio.msleep(200);
            rpio.write(40, rpio.LOW);
        }

        if (removedDevices.length > 0) {
            console.log('Devices removed:', removedDevices);
            knownAddresses = knownAddresses.filter(addr => !removedDevices.includes(addr));
        }

        if (newDevices.length === 0 && removedDevices.length === 0) {
            //console.log('No changes detected.');
        }
    }, interval);
}

// Start monitoring the I2C bus
monitorI2CDevices(100);
