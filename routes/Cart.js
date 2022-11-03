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
    if(!req.session.cart){
        res.render('view-cart', {usercart: null});
    } else{
        const cart = new Cart(req.session.cart);
        res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty});
    }
});

router.post("/add-to-cart", isAuth, function(req, res){
    const userId = req.session.userId;
    const { prodId, variation, quantity} = req.body;
    const selectQty = quantity;
    const selectVar = variation;
    // console.log(quantity);
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    Product.findById(prodId, function(err, product){
        if (err){
            console.log(err);
        } else{
            cart.add(product, product._id, selectQty, selectVar);
            req.session.cart = cart;
            console.log('display current session of cart: ',req.session.cart);
            res.redirect('/cart/view-cart');
        }
    });
});

module.exports = router;