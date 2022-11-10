const express = require('express');
const router = express.Router();

const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");

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
    Order.find({}, function(err, orders){
        if(err){
            console.log(err);
        } else {
            orders.forEach(function(order) {
                cart = new Cart(order.cart);
                order.items = cart.generateArray();
            });
            res.render('admin/orders', {orders: orders, fullName: req.session.firstName + " " + req.session.lastName});
        }
    });
});

router.post("/confirmed-order", isAuth, isAdmin, function(req, res){
    const{ orderId } = req.body;

    Order.findById(orderId, async function(err, order){
        if(err){
            console.log(err);
        } else {
            const variations = [];
            const quantity = [];
            const itemId = [];
            const originalQuantity = [];

            const itemsLength = Object.keys(order.cart.items).length;
            console.log(Object.keys(order.cart.items));

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            
            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemId.push(cart.item._id);
                quantity.push(cart.qty);
                variations.push(cart.variation);
            });

            //GET QUANTITY OF EACH SELECTED VARIATION
            for(let i = 0; i < itemsLength; i++){
                let productObject = await Product.findOne({_id: itemId[i]});
                let productObjectVariations = productObject.variations;

                const origQty = productObjectVariations.find(({ name }) => name == variations[i]);
                originalQuantity.push(origQty.quantity);
            }

            console.log(originalQuantity);
    
            for(let i = 0; i < itemsLength; i++){
    
                const conditions = {
                    _id: itemId[i],
                    'variations.name': {$eq: variations[i]}
                };

                const update = {
                    $set:{'variations.$.quantity': originalQuantity[i] - quantity[i]}
                };

                Product.findOneAndUpdate(conditions, update, function(err){
                    if(err){
                        console.log(err);
                    }
                });
            };  
            res.redirect('/admin/orders');
        }
    });
});

router.post("/completed-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Completed"}}, function(err, orders){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/orders');
        }
    });
});

router.post("/cancelled-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Cancelled"}}, function(err, orders){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/orders');
        }
    });
});

router.post("/refunded-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Refunded"}}, function(err, orders){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/orders');
        }
    });
});

router.post("/delete-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndDelete(orderId, function(err, orders){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/orders');
        }
    });
});

module.exports = router;