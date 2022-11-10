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
const Inventory = require("../../models/inventoryModel");

var fs = require('fs');
var path = require('path');

const multer = require("multer")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname)
    }
});
  

const upload = multer({
    storage: storage, 
}).single('productImage');



router.get("/", isAuth, isAdmin, function (req, res) {   
    // Product.find({}, function (err, allInventory) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         res.render('admin/inventory', { newListInventory: allInventory })
    //     }
    // });
    Product.aggregate([{
        $lookup: {
            from: "inventories", // collection to join
            localField: "_id",//field from the input documents
            foreignField: "productId",//field from the documents of the "from" collection
            as: "productDetails"// output array field
        }
    }, 
    {$unwind:'$productDetails'},
    {$addFields:{sales:'$productDetails.sales', sold:'$productDetails.sold',status:'$productDetails.status'}}//unwide and addfields removes array and adds it to the products collection
    ],function (err, allInventory) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/inventory', { newListInventory: allInventory, fullName: req.session.firstName + " " + req.session.lastName})
        }
    });
});

module.exports = router;