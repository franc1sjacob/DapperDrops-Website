const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const Order = require("../../models/orderModel");
const User = require("../../models/userModel");

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

router.get('/', isAuth, isAdmin, function(req, res){
    Order.find({ orderStatus: "Completed", feedbackMessage: { $ne: undefined }, feedbackRate: { $ne: undefined }}, function(err, order){
        if(err) { 
            console.log(err);
        } else {
            res.render('admin/feedback/feedback', { orders: order, fullName: req.session.firstName + " " + req.session.lastName });
        }
    })

})

module.exports = router;