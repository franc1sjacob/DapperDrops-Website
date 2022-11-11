const express = require('express');
const router = express.Router();

const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const Sale = require("../../models/salesModel");

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

router.post("/confirm-order", isAuth, isAdmin, function(req, res){
    const{ orderId } = req.body;

    Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Confirmed"}}, async function(err, order){
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
                console.log(origQty);
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

router.post("/pending-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Pending"}}, function(err, orders){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/orders');
        }
    });
});

router.post("/decline-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Declined"}}, function(err, orders){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/orders');
        }
    });
});

router.post("/complete-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Completed"}}, function(err, order){
        if(err){
            console.log(err);
        } else {
            console.log("ORDEEEEEEEEEEEEEEEER")
            console.log(order);
            let item;
            let items = [];

            cart = new Cart(order.cart);
            order.items = cart.generateArray();

            order.items.forEach(function(cart){
                item = {
                    itemBrand: cart.item.brand,
                    itemName: cart.item.name,
                    itemPrice: cart.item.price,
                    itemVariation: cart.variation,
                    itemQuantity: cart.qty,
                    itemTotal: cart.price
                }
                items.push(item);
            });

            console.log("ITEMSSSSSSSSSSSSSS", items);

            sale = new Sale({
                orderId: orderId,
                dateSold: order.dateCreated,
                earnings: order.amountPaid,
                items: items,
            });

            console.log("SALEEEEEEEEE", sale)

            sale.save(function (err){
                if(err){
                    console.log(err);
                } else {
                    console.log("save success");
                }
            });
        
            res.redirect('/admin/orders');
        }
    });
});

router.post("/cancel-order", isAuth, isAdmin, function(req, res){
    const{ orderId } = req.body;

    Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Cancelled"}}, async function(err, order){
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
                console.log(origQty);
                originalQuantity.push(origQty.quantity);
            }

            console.log(originalQuantity);
    
            for(let i = 0; i < itemsLength; i++){
    
                const conditions = {
                    _id: itemId[i],
                    'variations.name': {$eq: variations[i]}
                };

                const update = {
                    $set:{'variations.$.quantity': originalQuantity[i] + quantity[i]}
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

router.post("/refund-order", isAuth, isAdmin, function(req, res){
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

router.get("/:orderId", isAuth, isAdmin, function(req, res){
    const orderId = req.params.orderId;
    Order.findById({ _id: orderId }, function(err, order){
        if(err){
            console.log(err);
        } else {
            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            res.render('admin/view-order', { order: order , fullName: req.session.firstName + " " + req.session.lastName });
        }
    });
});

module.exports = router;