const express = require('express');
const router = express.Router();

const Product = require("../models/productModel");

router.get("/onhand", function(req, res){
    Product.find({category:"On-Hand"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("onhand", { newOnHandProducts: allProducts })
        }
    });
});

router.get("/preorder", function(req, res){
    Product.find({category:"Pre-Order"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("preorder", { newPreOrderProducts: allProducts })
        }
    });
});

router.get("/accessories", function(req, res){
    Product.find({category:"Accessories"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("accessories", { newAccessoriesProducts: allProducts })
        }
    });
});

router.get("/apparel", function(req, res){
    Product.find({category:"Apparel"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("apparel", { newApparelProducts: allProducts })
        }
    });
});

router.get("/item/:productId", function(req, res){
    const productId = req.params.productId;

    Product.findOne({_id:productId}, function(err, item){
        res.render('view-item', {item: item});
    });
});

module.exports = router;