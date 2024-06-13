const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const dotenv = require("dotenv");
const fs = require("fs");
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
        let db = mysql.createConnection(dbsettings);
        db.query("SELECT * FROM warnings", (err, result) => {
            if (err) throw err;
            db.end();
            res.render('warnings', { firstname: user.firstname, lastname: user.lastname, email: user.email, warnings: result});
        });
    } else {
        res.redirect('/box/login/warnings');
    }
});

module.exports = router;