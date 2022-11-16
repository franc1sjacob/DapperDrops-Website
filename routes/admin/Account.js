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

router.get("/", isAuth, isAdmin, async function(req, res){
    const { stype, sdir, ftype, fvalue } = req.query;
    let users;

    let query = req.query.query;

    if(!query) {
        query = "";
    }

    if(!ftype){
        users = await User.find({
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
                { accountType: { $regex: query, $options: "i" } }
            ]
        }).sort({ [stype]: sdir });

    } else {
        users = await User.find({
            [ftype]: fvalue,
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
                { accountType: { $regex: query, $options: "i" } }
            ]
        }).sort({ [stype]: sdir });
    }

    res.render('admin/account/accounts', {
        accounts: users,
        fullName: req.session.firstName + " " + req.session.lastName,
        query: query,
        stype: stype,
        sdir: sdir,
        ftype: ftype,
        fvalue: fvalue
    });
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