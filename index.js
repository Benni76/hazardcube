const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const socketio = require('socket.io');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const createError = require('http-errors');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = process.env.PORT2;
const mysql = require('mysql');
const dgram = require('dgram');
const webpush = require('web-push');
const dbsettings = {
    host: process.env.HOST,
    user: process.env.USER,
    port: process.env.PORT,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
};

const publicVapidKey = process.env.PUBLIC_VAPID_KEY;

const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webpush.setVapidDetails("mailto:" + process.env.EMAIL, publicVapidKey, privateVapidKey);


// configure express
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret12341234',
    resave: true,
    saveUninitialized: true
}));
app.set('view engine', 'hbs');

// routes

app.use('/', require('./routes/index'));
app.use('/register', require('./routes/register'));
app.use('/login', require('./routes/login'));
app.use('/logout', require('./routes/logout'));
app.use('/home', require('./routes/home'));
app.use('/map', require('./routes/map'));
app.use('/warnings', require('./routes/warnings'));
app.use('/notify', require('./routes/notify'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log(err);
    let user = req.session;
    if(user.loggedin){
        res.render('error',
            {
                message: err.message,
                error: req.app.get('env') === 'development' ? err : {},
                firstname: user.firstname,
                lastname: user.lastname,
            });
    } else {
        res.redirect('/box/login');
    }
});

io.on('connection', (socket) => {
    socket.on('map', (data) => {
        console.log(data);
        let db1 = mysql.createConnection(dbsettings);
        let query1 = mysql.format("SELECT * FROM zones");
        db1.query(query1, (err, result) => {
            //console.log(result);
            if (err) throw err;
            let query2 = mysql.format("SELECT * FROM boxes");
            db1.query(query2, (err, boxes) => {
                if (err) throw err;
                db1.end();
                socket.emit('zones', result);
                socket.emit('boxes', boxes);
            });
        });
        setInterval(() => {
            let db = mysql.createConnection(dbsettings);
            let query = mysql.format("SELECT * FROM zones");
            db.query(query, async (err, result) => {
                //console.log(result);
                if (err) throw err;
                let query2 = mysql.format("SELECT * FROM boxes");
                db.query(query2, (err, boxes) => {
                    if (err) throw err;
                    db.end();
                    socket.emit('zones', result);
                    socket.emit('boxes', boxes);
                });
            });
        }, 500);
    });

    socket.on('box_connected', (data) => {
        //console.log(data);
        let db = mysql.createConnection(dbsettings);
        let query = mysql.format("SELECT * FROM boxes WHERE id = ?", [data.id]);
        db.query(query, (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                let query = mysql.format("UPDATE boxes SET gps = ?, battery = ?, temperature = ?, humidity = ?, airpressure = ?, acceleration = ?, gas = ?, flood = ?, modules = ?, currentTime = ? WHERE id = ?", [JSON.stringify(data.gps), data.battery, data.temperature, data.humidity, data.airpressure, JSON.stringify(data.acceleration), data.gas, data.flood, JSON.stringify(data.modules), data.currentTime, data.id]);
                db.query(query, (err, result) => {
                    if (err) throw err;
                    db.end();
                });
            } else {
                let query = mysql.format("INSERT INTO boxes (id, gps, battery, temperature, humidity, airpressure, acceleration, gas, flood, modules, currentTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, JSON.stringify(data.gps), data.battery, data.temperature, data.humidity, data.airpressure, JSON.stringify(data.acceleration), data.gas, data.flood, JSON.stringify(data.modules), data.currentTime]);
                db.query(query, (err, result) => {
                    if (err) throw err;
                    db.end();
                });
            }
        });
    });

    socket.on('warning', (data) => {
        console.log(data);
        let db = mysql.createConnection(dbsettings);
        // get zone of data.id
        let query = mysql.format("SELECT * FROM boxes WHERE id = ?", [data.id]);
        const now = new Date();
        db.query(query, (err, result) => {
            if (err) throw err;
            //console.log(result);
            if(result.length === 0){
                db.end();
                return;
            }
            let box = result[0];
            let zone = box.asignedZone;
            // if there was a warning from the same box in the last 10 minutes
            let nowTime = now.getTime();
            let thirtySecondsAgo = nowTime - 30000;
            let tenMinutesAgo = nowTime - 10 * 60000;
                    
            db.query("SELECT * FROM warnings WHERE zone = ? AND box = ? AND type = ?", [zone, data.id, data.type], (err, results) => {
                if (err) throw err;
            
                let recentWarnings = results.filter(result => {
                    let resultTime = new Date(result.time).getTime();
                    return resultTime > thirtySecondsAgo && resultTime < nowTime;
                });
            
                console.log(recentWarnings.length);
                console.log(recentWarnings);
            
                if (recentWarnings.length >= 1) {
                    db.end();
                    return;
                }
            
                let query = mysql.format("INSERT INTO warnings (type, box, zone, time) VALUES (?, ?, ?, ?)", [data.type, data.id, zone, data.time]);
                db.query(query, (err, result) => {
                    if (err) throw err;
                    console.log("Warning inserted");
                
                    db.query("SELECT * FROM warnings WHERE zone = ? AND box != ? AND type = ?", [zone, data.id, data.type], (err, results) => {
                        if (err) throw err;
                    
                        let recentWarnings = results.filter(result => {
                            let resultTime = new Date(result.time).getTime();
                            return resultTime > tenMinutesAgo && resultTime < nowTime;
                        });
                    
                        if(data.type === "earthquake"){
                            if (recentWarnings.length >= 1) {
                                // send warning to all clients
                                io.emit('sendWarning', [data, recentWarnings]);
                            }
                        } else if(data.type === "fire"){
                            io.emit('sendWarning', [data, recentWarnings]);
                        } else if(data.type === "flood"){
                            io.emit('sendWarning', [data, recentWarnings]);
                        }
                        db.end();
                    });
                });
            });
        });
    });

    socket.on('notify', (data) => {
        let db = mysql.createConnection(dbsettings);
        let query = mysql.format("SELECT * FROM notify");
        db.query(query, (err, result) => {
            if (err) throw err;
            db.end();
            result.forEach(subscription => {
                webpush.sendNotification(JSON.parse(subscription.subscription), JSON.stringify(data)).catch(console.log);
            });
        });
    });
});

const server2 = dgram.createSocket('udp4');

server2.on('message', (msg, rinfo) => {
    //console.log(`Server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    let data = JSON.parse(msg);
    //console.log(data);
    let db = mysql.createConnection(dbsettings);
    let query = mysql.format("SELECT * FROM boxes WHERE id = ?", [data.id]);
    db.query(query, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            let query = mysql.format("UPDATE boxes SET gps = ?, battery = ?, temperature = ?, humidity = ?, airpressure = ?, acceleration = ?, gas = ?, flood = ?, modules = ?, currentTime = ? WHERE id = ?", [JSON.stringify(data.gps), data.battery, data.temperature, data.humidity, data.airpressure, JSON.stringify(data.acceleration), data.gas, data.flood, JSON.stringify(data.modules), data.currentTime, data.id]);
            db.query(query, (err, result) => {
                if (err) throw err;
                db.end();
            });
        } else {
            let query = mysql.format("INSERT INTO boxes (id, gps, battery, temperature, humidity, airpressure, acceleration, gas, flood, modules, currentTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, JSON.stringify(data.gps), data.battery, data.temperature, data.humidity, data.airpressure, JSON.stringify(data.acceleration), data.gas, data.flood, JSON.stringify(data.modules), data.currentTime]);
            db.query(query, (err, result) => {
                if (err) throw err;
                db.end();
            });
        }
    });
});

server2.on('listening', () => {
    const address = server2.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
  });

server2.bind(41234);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});