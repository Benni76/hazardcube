const Raspi = require('raspi');
const I2C = require('raspi-i2c').I2C;
const ADS1x15 = require('raspi-kit-ads1x15');

module.exports = function flood() {
    return new Promise((resolve, reject) => {
        Raspi.init(() => {
            const i2c = new I2C();
            const adc = new ADS1x15({
                i2c,
                chip: ADS1x15.chips.IC_ADS1115,
                address: ADS1x15.address.ADDRESS_0x48,
                pga: ADS1x15.pga.PGA_4_096V,
                sps: ADS1x15.spsADS1115.SPS_250
            });

            adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
                if (err) {
                    reject('Failed to fetch value from ADC');
                } else {
                    resolve(value);
                }
            });
        });
    });
}
