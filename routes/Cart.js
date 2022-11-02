const express = require('express');
const router = express.Router();

const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const { ObjectID } = require('bson');

var cart;

const isAuth = function(req, res, next){
    if(req.session.isAuth){
        next();
    } else {
        res.render('login', { message: "Please login to your account to access this page." });
    }
}

router.get("/view-cart", isAuth, function(req, res){
    Cart.findOne({userId: req.session.userId}, function(err, cart){
        if(err){
            console.log(err);
        } else{
            res.render('view-cart', {cart: cart});
        }
    });
});

router.post("/add-to-cart", function(req, res){
    const userId = req.session.userId;
    const { prodId, variation, quantity} = req.body;
    console.log(req.body);
    Product.findById(prodId, function(err, foundProduct){
        const product = {
            productId: foundProduct._id,
            name: foundProduct.name,
            brand: foundProduct.brand,
            category: foundProduct.category,
            variation: variation,
            quantity: quantity,
            price: foundProduct.price,
            totalPrice: foundProduct.price * quantity
        }
        Cart.findOneAndUpdate({userId: userId},  {$push: {products: [product]}}, function(err){
            if(err){
                console.log(err);
            } else{
                res.redirect('/cart/view-cart');
            }
        });
    });
});

module.exports = router;