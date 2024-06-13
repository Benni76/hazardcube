const io = require("socket.io-client");
const VL53L0X = require('vl53l0x');
const { SerialPort } = require("serialport");
const GPS = require("gps");
const { ReadlineParser } = require('@serialport/parser-readline');
const { initializeBNO055, readAcceleration } = require("./modules/bno055.js");
const moduleData = require("./modules/ads1115_1.js");
const magnet = require("./modules/ads1115_box.js");
const i2c = require('i2c-bus');
var rpio = require('rpio');
const Raspi = require('raspi');
const I2C = require('raspi-i2c').I2C;
const ADS1x15 = require('raspi-kit-ads1x15');
const dgram = require('dgram');

rpio.open(40, rpio.OUTPUT, rpio.LOW);
let adc;

Raspi.init(() => {
    try {
        console.log("Raspi initialized. Initializing I2C...");
        const i2c = new I2C();
        console.log("I2C initialized. Initializing ADS1115...");
        adc = new ADS1x15({
            i2c,
            chip: ADS1x15.chips.IC_ADS1115,
            address: ADS1x15.address.ADDRESS_0x48,
            pga: ADS1x15.pga.PGA_4_096V,
            sps: ADS1x15.spsADS1115.SPS_250 // Corrected sps assignment
        });
    } catch (error) {
        console.error("Initialization error:", error);
    }
});



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
            //rpio.write(40, rpio.HIGH);
            //rpio.msleep(200);
            //rpio.write(40, rpio.LOW)
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


const socket = io('https://b76host.de', {
    path: '/box/socket.io',
    transports: ['polling']
});

var gpsData = {};
var accelerationData = {};
var gasData = 0;
var floodData = 0;
var modules = {};
var box_data = {};

let earthID = 0;
let fireID = 0;
let waterID = 0;
let boxID = 0;
let distance;
try {
    VL53L0X(1, 0x29).then(async (vl53l0x) => {
        setInterval(async () => {
            try {
                const distanceData = await vl53l0x.measure();
                distance = distanceData;
            } catch (error) {
                console.error("Error measuring distance:", error);
            }
        }, 50);
    });
} catch(err) {
    console.log(err);
}

let earthquakeAvg = [];
let times = 0;
let distanceTimes = 0;
var oldI2CAddresses = [];

setInterval(async () => {
    let i2cAddresses = await scanI2CBus();
    if(oldI2CAddresses.length == 0) {
        oldI2CAddresses = i2cAddresses;
    }

    if(i2cAddresses.length > oldI2CAddresses.length) {
        let newDevices = detectNewDevices(oldI2CAddresses, i2cAddresses);
        if(newDevices.length > 0) {
            console.log('New devices detected:', newDevices);
            rpio.write(40, rpio.HIGH);
            rpio.msleep(200);
            rpio.write(40, rpio.LOW)
            oldI2CAddresses = i2cAddresses;
        }
    }

    if(i2cAddresses.length < oldI2CAddresses.length) {
        let removedDevices = detectRemovedDevices(oldI2CAddresses, i2cAddresses);
        if(removedDevices.length > 0) {
            console.log('Devices removed:', removedDevices);
            rpio.write(40, rpio.HIGH);
            rpio.msleep(400);
            rpio.write(40, rpio.LOW)
            oldI2CAddresses = i2cAddresses;
        }
    }
    //console.log(i2cAddresses);
    if(i2cAddresses.includes(73)) {
        console.log("electromagnet");
    }

    if(i2cAddresses.includes(41)) {
        boxID = 1;
        //console.log("box");
        setInterval(async () => {
            if(boxID == 1) {
                try {
                    //console.log(distance);
                    if(distance < 50) {
                        console.log(distance);
                        distanceTimes++;
                        if(distanceTimes > 100) {
                            // do drop logic -> electromagnet cant connect yet
                        }
                    } else {
                        distanceTimes--;
                    }
                } catch (error) {
                    console.error("Error measuring distance:", error);
                }
            }
        }, 100);
    } else {
        boxID = 0;
    }
    if(i2cAddresses.includes(72)) {
        let data;
        adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
            if (err) {
                //console.error("Error reading channel:", err);
            } else {
                //console.log("Channel read successful. Value:", value, "Volts:", volts);
                data = value;
                if(!fireID && !waterID) {
                    if(data>10000 && data<24000) {
                        fireID = 1;
                        console.log("fire");
                        modules["fire"] = true;
                        setTimeout(async () => {
                            setInterval(async () => {
                                let fireData;
                                adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
                                    if (err) {
                                        //console.error("Error reading channel:", err);
                                    } else {
                                        //console.log("Channel read successful. Value:", value, "Volts:", volts);
                                        fireData = value;
                                        gasData = fireData;
                                        if(fireData > 29000 && fireData < 32000) {
                                            console.log("fire!!! " + value);
                                            socket.emit('warning', [ 'fire', id, new Date().toISOString() ]);
                                        }
                                    }
                                });
                            }, 100);
                        }, 100);
                    }
                    if(data < 1000) {
                        waterID = 1;
                        console.log("water");
                        modules["flood"] = true
                        setTimeout(async () => {
                            setInterval(async () => {
                                let waterData;
                                adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
                                    if (err) {
                                        //console.error("Error reading channel:", err);
                                    } else {
                                        //console.log("Channel read successful. Value:", value, "Volts:", volts);
                                        waterData = value;
                                        floodData = waterData;
                                        if(waterData > 20000) {
                                            console.log("flood!!!");
                                            socket.emit('warning', [ 'fire', id, new Date().toISOString() ]);
                                        }
                                    }
                                });
                            }, 100);
                        }, 100);
                    }
                }
            }
        });
        
    } else {
        fireID = 0;
        waterID = 0;
        modules["fire"] = false;
        modules["flood"] = false;
        fireData = 0;
        waterData = 0;
    }

    if(i2cAddresses.includes(40)) {
        earthID = 1;
        //console.log("earthquake");
        modules["earthquake"] = true;
        initializeBNO055().then(() => {
            setInterval(async () => {
                if(earthID) {
                    try {
                        accelerationData = await readAcceleration();

                        earthquakeDetection = Math.sqrt(accelerationData.x**2 + accelerationData.y**2 + accelerationData.z**2);
                        // get an average value and detect if it changes
                        if(times < 11) {
                            earthquakeAvg = [...earthquakeAvg, earthquakeDetection];
                            times++;
                        }
                        if(times >= 11) {
                            // if average is higher than 11: reset
                            //console.log(Math.max(...earthquakeAvg));
                            if(Math.max(...earthquakeAvg) > 9.85) {
                                times = 0;
                                earthquakeAvg = [];
                            } else {
                                if(earthquakeDetection > 0.03 + Math.max(...earthquakeAvg) && earthquakeDetection < 10.1) {
                                    console.log(earthquakeDetection);
                                    console.log("earthquake!!!");
                                    socket.emit('warning', { id: id, type: "earthquake", time: new Date().toISOString() });
                                }
                                times++;
                                if(times > 199) {
                                    times = 0;
                                    earthquakeAvg = [];
                                }
                            }
                        }
                    } catch (error) {
                        console.log("Error reading acceleration data:", error);
                    }
                }
            }, 100);
        });
    } else {
        earthID = 0;
        modules["earthquake"] = false;
        accelerationData = { x: 0, y: 0, z: 0 };
        times = 0;
        earthquakeAvg = [];
    }

    //console.log(gasData);
    //console.log(floodData);
    //console.log(accelerationData);
    //console.log(modules);
    // Create box_data object
    //try {
    //    // Create box_data object
    //    const box_data = {
    //        id: id,
    //        gps: gpsData,
    //        battery: 100,
    //        temperature: 20,
    //        humidity: 50,
    //        airpressure: 1013,
    //        acceleration: accelerationData,
    //        gas: gasData,
    //        flood: floodData,
    //        modules: modules,
    //        currentTime: new Date().toISOString()
    //    };
    //    
    //    console.log("sending");
    //    socket.emit("box_connected", box_data);
    //} catch (error) {
    //    console.log("Error sending data:", error);
    //}
}, 100);

const id = "box_001"

const port = new SerialPort({
    path:"/dev/serial0",
    baudRate:9600,
  });
const gps = new GPS();
const parser = port.pipe(new ReadlineParser())


port.on("open", () => {
    console.log("Port open");
});

parser.on("data", data => {
    try {
        gps.update(data);
    } catch (e) {
        throw e;
    }
});

gps.on("data", async data => {
    if(data.type == "GGA") {
        gpsData["alt"] = data.alt;
    } else if(data.type == "RMC") {
        gpsData["time"] = data.time;
        gpsData["status"] = data.status;
        gpsData["lat"] = data.lat;
        if(!data.lat) {
            gpsData["lat"] = 48.557137026479346;
        }
        gpsData["lon"] = data.lon;
        if(!data.lon) {
            gpsData["lon"] = 13.414699200110526;
        }
        gpsData["speed"] = data.speed;
        gpsData["track"] = data.track;
        gpsData["variation"] = data.variation;
        gpsData["faa"] = data.faa;
        gpsData["navStatus"] = data.navStatus;
        gpsData["raw"] = data.raw;
    } else if(data.type == "VTG") {

    } else if(data.type == "GSA") {

    } else if(data.type == "GSV") {
        gpsData["msgNumber"] = data.msgNumber;
        gpsData["msgsTotal"] = data.msgsTotal;
        gpsData["satsInView"] = data.satsInView;
        gpsData["satellites"] = data.satellites;
    } else if(data.type == "GLL") {

    }
});

const client = dgram.createSocket('udp4');

//socket.on("connect", () => {
//    console.log("Connected to server");
//
//    // Create box_data object
//    const box_data = {
//        id: id,
//        gps: gpsData,
//        battery: 100,
//        temperature: 20,
//        humidity: 50,
//        airpressure: 1013,
//        acceleration: accelerationData,
//        gas: gasData,
//        flood: floodData,
//        modules: modules,
//        currentTime: new Date().toISOString()
//    };
//    
//    console.log("sending");
//    socket.emit("box_connected", box_data);
//});

setInterval(() => {
    const box_data = {
        id: id,
        gps: gpsData,
        battery: 100,
        temperature: 20,
        humidity: 50,
        airpressure: 1013,
        acceleration: accelerationData,
        gas: gasData,
        flood: floodData,
        modules: modules,
        currentTime: new Date().toISOString()
    };

    const msg = Buffer.from(JSON.stringify(box_data));
    const port = 41234;
    const host = "45.9.60.185";

    client.send(msg, 0, msg.length, port, host, (err) => {
        if (err) {
            console.error('Error sending message:', err);
        } else {
            console.log('Message sent');
        }
        //client.close();
    });
    console.log("sending");
}, 500);