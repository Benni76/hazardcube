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

router.get("/:redirect?", (req, res) => {
    const redirect = req.params.redirect;
    if(redirect){
        res.render("login", { redirect });
    } else {
        res.redirect("/box/login/home");
    }
});

router.post("/:redirect", (req, res) => {
    const redirect = req.params.redirect;
    const email = req.body.email;
    const password = req.body.password;
    let errors = [];
    if (!email || !password) {
        errors.push({ msg: "Bitte fülle alle Felder aus." });
    }
    if (errors.length > 0) {
        res.render("login", {
            errors,
            email,
            password
        });
    } else {
        // Validation passed
        let db = mysql.createConnection(dbsettings);
        let query = mysql.format("SELECT * FROM users WHERE email = ?", [email]);
        db.query(query, (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                // User exists
                bcrypt.compare(password, result[0].password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        req.session.loggedin = true;
                        req.session.email = email;
                        req.session.firstname = result[0].firstname;
                        req.session.lastname = result[0].lastname;
                        
                        db.end();
                        res.redirect("/box/" + redirect);
                    } else {
                        db.end();
                        errors.push({ msg: "Falsches Passwort." });
                        res.render("login", {
                            errors,
                            email,
                            password
                        });
                    }
                });
            } else {
                db.end();
                errors.push({ msg: "Email nicht registriert." });
                res.render("login", {
                    errors,
                    email,
                    password
                });
            }
        });
    }
});

module.exports = router;