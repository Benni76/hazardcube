const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const dotenv = require('dotenv');
dotenv.config({ path: "../.env" });
const mysql = require('mysql');
const dbsettings = {
    host: process.env.HOST,
    user: process.env.USER,
    port: process.env.PORT,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
};

router.get('/', (req, res) => {
        res.render('notify', { publicVapidKey: process.env.PUBLIC_VAPID_KEY });
});

router.post('/subscribe', (req, res) => {
    let db = mysql.createConnection(dbsettings);

    // search for the subscription in notify table and add it if it doesnt exist
    let sql = "SELECT * FROM notify WHERE subscription = ?";
    db.query(sql, [`${JSON.stringify(req.body)}`], (err, result) => {
        if (err) {
            console.log(err);
        }
        console.log(result)
        console.log(result.length)
        if (result.length == 0) {
            sql = "INSERT INTO notify (subscription) VALUES (?)";
            db.query(sql, [`${JSON.stringify(req.body)}`], (err, result) => {
                if (err) {
                    console.log(err);
                }
            });
        }
        db.end();
    });

    const subscription = req.body;
    res.status(201).json({});
    const payload = JSON.stringify({ title: "Abonniert", body: "Du hast Benachrichtigungen aktiviert!" });
    setTimeout(() => {
        webpush.sendNotification(subscription, payload).catch(console.log);
    }, 1000);
})


module.exports = router;