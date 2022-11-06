const express = require('express');
const router = express.Router();

const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const { ObjectID } = require('bson');

const isAuth = function(req, res, next){
    if(req.session.isAuth){
        next();
    } else {
        res.render('login', { message: "Please login to your account to access this page." });
    }
}

router.get("/view-cart", function(req, res){
    if(!req.session.cart){
        res.render('view-cart', {usercart: null});
    } else{
        const cart = new Cart(req.session.cart);
        res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty});
    }
});

router.post("/add-to-cart", function(req, res){
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
            cart.add(product, product._id+selectVar, selectQty, selectVar);
            req.session.cart = cart;
            console.log('display current session of cart: ',req.session.cart);
            res.redirect('/cart/view-cart');
        }
    });
});

router.post("/reduce-one", function(req, res){
    const { prodId, variation } = req.body;
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.reduceByOne(prodId+variation);
    req.session.cart = cart;
    res.redirect('/cart/view-cart');
}); 

router.post("/add-one", function(req, res){
    const { prodId, variation } = req.body;
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.addByOne(prodId+variation);
    req.session.cart = cart;
    res.redirect('/cart/view-cart');
}); 


router.get("/remove-item/:id/:variation", function(req, res){
    const prodId = req.params.id;
    const variation = req.params.variation;
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.removeItem(prodId+variation);
    req.session.cart = cart;
    res.redirect('/cart/view-cart');
    
}); 

router.get("/checkout", isAuth, function(req, res){
    if(!req.session.cart){
        res.redirect('/cart/view-cart');
    }
    const cart = new Cart(req.session.cart);
    res.render('checkout', {total: cart.totalPrice});
});

router.post("/place-order", isAuth, function(req, res){
    const user = req.session.userId;
    const cart = new Cart(req.session.cart);

    User.findById(user, function(err, result){
        if(err){
            console.log(err);
        }
        else{
            console.log(result.defaultAddress);
            const order = new Order({
                userId: req.session.userId,
                cart: cart,
                address: result.defaultAddress,
                paymentStatus: "Pending",
                orderStatus: "Pending",
                proofPayment: "gcash",
                amountPaid: 0,
                amountRemaining: cart.totalPrice
            });
        
            order.save(function(err, result){
                if(err){
                    console.log(err);
                }
                else{
                    req.session.cart = null;
                    res.redirect('/account/view-orders');
                }
            });
        }
    });
});

module.exports = router;