const express = require('express');
const router = express.Router();

const User = require("../../models/userModel");

router.get("/", function(req, res){
    User.find({}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.render('admin/accounts', {accounts: foundAccounts});
        }
    });
});

router.get("/upgrade-account", function(req, res){
    res.render('admin/accounts');
});

router.get("/downgrade-account", function(req, res){
    res.render('admin/accounts');
});

router.post("/upgrade-account", function(req, res){
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

router.post("/downgrade-account", function(req, res){
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