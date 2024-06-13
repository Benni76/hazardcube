'use strict';

const { Bme680 } = require('bme680-sensor');
const bme680 = new Bme680(1, 0x77);

const initializeSensor = async () => {
    try {
        await bme680.initialize();
        
        await bme680.setPowerMode(1);
        await bme680.setGasStatus(0x02)
        setInterval(async () => {
            console.log(await bme680.getSensorData());
        }, 200);
        
        console.log('BME688 sensor initialized and heater profile set');
    } catch (error) {
        console.error('Failed to initialize sensor', error);
    }
};

initializeSensor();