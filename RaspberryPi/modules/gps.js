const { SerialPort } = require("serialport");
const GPS = require("gps");
const { ReadlineParser } = require('@serialport/parser-readline');

module.exports = function gps() {
    return new Promise((resolve, reject) => {
        const port = new SerialPort({
            path:"/dev/serial0",
            baudRate:9600,
          });
        const gps = new GPS();
        const parser = port.pipe(new ReadlineParser())
        let data2 = {};

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
            console.log(data);
            if(data.type == "GGA") {
                data2["alt"] = data.alt;
            } else if(data.type == "RMC") {
                data2["time"] = data.time;
                data2["status"] = data.status;
                data2["lat"] = data.lat;
                data2["lon"] = data.lon;
                data2["speed"] = data.speed;
                data2["track"] = data.track;
                data2["variation"] = data.variation;
                data2["faa"] = data.faa;
                data2["navStatus"] = data.navStatus;
                data2["raw"] = data.raw;
            } else if(data.type == "VTG") {
        
            } else if(data.type == "GSA") {
        
            } else if(data.type == "GSV") {
                data2["msgNumber"] = data.msgNumber;
                data2["msgsTotal"] = data.msgsTotal;
                data2["satsInView"] = data.satsInView;
                data2["satellites"] = data.satellites;
            } else if(data.type == "GLL") {
        
            }
        });
    });
}
