var rpio = require('rpio');
rpio.open(40, rpio.OUTPUT, rpio.LOW);

rpio.write(40, rpio.HIGH);
rpio.msleep(200);
rpio.write(40, rpio.LOW)