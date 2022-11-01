const express = require('express');
const router = express.Router();

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

router.get("/", isAuth, isAdmin, function(req, res){
    User.find({}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.render('admin/accounts', {accounts: foundAccounts, fullName: req.session.firstName + " " + req.session.lastName });
        }
    });
});

router.get("/upgrade-account", isAuth, isAdmin, function(req, res){
    res.render('admin/accounts');
});

router.get("/downgrade-account", isAuth, isAdmin, function(req, res){
    res.render('admin/accounts');
});

router.post("/upgrade-account", isAuth, isAdmin, function(req, res){
    const upgradeId = req.body.upgradeId;
    User.findByIdAndUpdate(upgradeId, {$set: {accountType: "admin"}}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/accounts');
        }
    });
});

router.post("/downgrade-account", isAuth, isAdmin, function(req, res){
    const downgradeId = req.body.downgradeId;
    User.findByIdAndUpdate(downgradeId, {$set: {accountType: "user"}}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/accounts');
        }
    });
});

module.exports = router;