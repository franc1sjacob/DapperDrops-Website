const express = require('express');
const router = express.Router();

const Product = require("../models/productModel");

router.get("/onhand", function(req, res){
    Product.find({type:"On-Hand"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("onhand", { newOnHandProducts: allProducts })
        }
    });
});

router.get("/preorder", function(req, res){
    Product.find({type:"Pre-Order"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("preorder", { newPreOrderProducts: allProducts })
        }
    });
});

router.get("/accessories", function(req, res){
    Product.find({type:"Accessories"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("accessories", { newAccessoriesProducts: allProducts })
        }
    });
});

router.get("/apparel", function(req, res){
    Product.find({type:"Apparel"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("apparel", { newApparelProducts: allProducts })
        }
    });
});

module.exports = router;