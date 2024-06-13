const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const dotenv = require("dotenv");
const fs = require("fs");
const weather = require('weather-js');

dotenv.config({ path: "../.env" });

let dbsettings = {
    host: process.env.HOST,
    user: process.env.USER,
    port: process.env.PORT,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
};

router.get('/', (req, res) => {
    let user = req.session;
    if(user.loggedin){
        res.render('map', { firstname: user.firstname, lastname: user.lastname, email: user.email});
    } else {
        res.redirect('/box/login/map');
    }
});

router.post('/createZone', (req, res) => {
    let zone = req.body;
    let db = mysql.createConnection(dbsettings);
    db.query("SELECT * FROM zones WHERE name = ?", [zone.name], (err, result) => {
        if (err) throw err;
        console.log(result)
        if (result.length > 0) {
            db.end();
            res.send("Zone already exists");
        } else {
            let query = mysql.format("INSERT INTO zones (name, points) VALUES (?, ?)", [zone.name, JSON.stringify(zone.points)]);
            db.query(query, (err, result) => {
                if (err) throw err;
                db.end();
                res.send(result);
            });
        }
    });
});

router.get('/getZoneInformation', (req, res) => {
    let id = req.query.zone;
    let region = req.query.region;
    let db = mysql.createConnection(dbsettings);
    let query = mysql.format("SELECT * FROM zones WHERE name = ?", [id]);
    db.query(query, (err, result1) => {
        if (err) throw err;
        let query = mysql.format("SELECT * FROM boxes WHERE asignedZone = ?", [id]);
        db.query(query, (err, boxes) => {
            if (err) throw err;
            db.end();
            // weather, boxes, etc.
            weather.find({search: region, degreeType: 'C'}, function(err, result) {
                if(err) console.log(err);
            
                res.send({zone: result1, boxes: boxes, weather: result});
            });
        });
    });
});

router.post('/deleteZone', (req, res) => {
    let id = req.body.zone;
    let db = mysql.createConnection(dbsettings);
    let query = mysql.format("DELETE FROM zones WHERE name = ?", [id]);
    db.query(query, (err, result) => {
        if (err) throw err;
        // clear asignedZone from boxes
        let query = mysql.format("UPDATE boxes SET asignedZone = NULL WHERE asignedZone = ?", [id]);
        db.query(query, (err, result2) => {
            if (err) throw err;
            db.end();
            res.send(result);
        });
    });
});

router.post('/asignBoxes', (req, res) => {
    let data = req.body;
    let db = mysql.createConnection(dbsettings);
    // for each box, update the asignedZone
    data.boxes.forEach(box => {
        let query = mysql.format("UPDATE boxes SET asignedZone = ? WHERE id = ?", [data.zone, box]);
        db.query(query, (err, result) => {
            if (err) throw err;
        });
    });
    db.end();
    res.send("Boxes asigned");
});

module.exports = router;