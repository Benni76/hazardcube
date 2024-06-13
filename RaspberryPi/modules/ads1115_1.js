const Raspi = require('raspi');
const I2C = require('raspi-i2c').I2C;
const ADS1x15 = require('raspi-kit-ads1x15');

module.exports = function gas() {
    return new Promise((resolve, reject) => {
        console.log("Initializing Raspi...");
        Raspi.init(() => {
            try {
                console.log("Raspi initialized. Initializing I2C...");
                const i2c = new I2C();
                console.log("I2C initialized. Initializing ADS1115...");
                const adc = new ADS1x15({
                    i2c,
                    chip: ADS1x15.chips.IC_ADS1115,
                    address: ADS1x15.address.ADDRESS_0x48,
                    pga: ADS1x15.pga.PGA_4_096V,
                    sps: ADS1x15.spsADS1115.SPS_250 // Corrected sps assignment
                });

                console.log("ADS1115 initialized. Reading channel...");
                adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
                    if (err) {
                        console.error("Error reading channel:", err);
                        reject(new Error(`Error reading from channel: ${err.message}`));
                    } else {
                        console.log("Channel read successful. Value:", value, "Volts:", volts);
                        resolve({ value, volts });
                    }
                });
            } catch (error) {
                console.error("Initialization error:", error);
                reject(new Error(`Initialization error: ${error.message}`));
            }
        });
    });
}