const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    let user = req.session;
    if(user.loggedin){
        res.redirect('/box/home');
    } else {
        res.redirect('/box/login/home');
    }
});

module.exports = router;