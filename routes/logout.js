const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    req.session.destroy();
    res.redirect("/box/login");
});

module.exports = router;