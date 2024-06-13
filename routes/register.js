const express = require("express");
const router = express.Router();
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const session = require("express-session");
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

router.get("/", (req, res) => {
    res.render("register");
});

router.post("/", (req, res) => {
    let firstname = req.body.firstname;
    let lastname = req.body.lastname;
    let email = req.body.email;
    let password = req.body.password;
    let password2 = req.body.password2;

    let errors = [];
    if(!firstname || !lastname || !email || !password || !password2){
        errors.push({ msg: "Bitte fülle alle Felder aus." });
    }
    if (password !== password2) {
        errors.push({ msg: "Passwörter stimmen nicht überein." });
    }
    if (password.length < 8) {
        errors.push({ msg: "Passwort muss mindestens 8 Zeichen haben." });
    }
    if (errors.length > 0) {
        res.render("register", {
            errors,
            firstname,
            lastname,
            email,
            password,
            password2
        });
    } else {
        let db = mysql.createConnection(dbsettings);
        let query = mysql.format("SELECT * FROM users WHERE email = ?", [email]);
        db.query(query, (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                db.end();
                errors.push({ msg: "Email ist bereits registriert." });
                res.render("register", {
                    errors,
                    firstname,
                    lastname,
                    email,
                    password,
                    password2
                });
            } else {
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password, salt, (err, hash) => {
                        let db = mysql.createConnection(dbsettings);
                        let query = mysql.format("INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)", [firstname, lastname, email, hash]);
                        db.query(query, (err, result) => {
                            if (err) throw err;
                            db.end();
                            res.redirect("/box/login");
                        });
                    });
                });
            }
        });
    }
});

module.exports = router;