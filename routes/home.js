const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    let user = req.session;
    if(user.loggedin){
        res.render('home', { firstname: user.firstname, lastname: user.lastname, email: user.email});
    } else {
        res.redirect('/box/login/home');
    }
});

module.exports = router;