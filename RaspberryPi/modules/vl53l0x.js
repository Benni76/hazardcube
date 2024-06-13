const VL53L0X = require('vl53l0x')
const args = [1, 0x29]
// Optionally, try developing with an i2cdriver!
// const args = ['/dev/tty.usbserial-DO01INSW', 0x29, 'i2cdriver/i2c-bus']

VL53L0X(...args).then(async (vl53l0x) => {
  while(true) {
    var measured = await vl53l0x.measure();
    console.log(measured);
  }
})
.catch(console.error)