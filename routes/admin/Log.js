const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const isAuth = function(req, res, next){
    if(req.session.isAuth){
        next();
    } else {
        res.redirect('/account/login');
    }
}

const isAdmin = function(req, res, next){
    if(req.session.accountType === "admin"){
        req.session.isAdmin = true;
        next();
    } else {
        res.redirect('/');
    }
}

const Product = require("../../models/productModel");
const Log = require("../../models/logModel");

router.get("/", isAuth, isAdmin, async function (req, res) {
    const logs = await Log.find({});

    res.render('admin/log/log', {
        fullName: req.session.firstName + " " + req.session.lastName,
        logs: logs
    });
});

module.exports = router;
