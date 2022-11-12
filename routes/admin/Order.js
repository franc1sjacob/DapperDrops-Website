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
                
                // if(originalQuantity[i] - quantity[i] === 5){
                //     status = "In-Stock"
                // }

                const update = {
                    $set:{'variations.$.quantity': originalQuantity[i] - quantity[i],
                    // 'variations.$.status': status

                    }
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
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Completed"}}, function(err, orders){
        if(err){
            console.log(err);
        } else {
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

router.get("/view-order-:orderId", isAuth, isAdmin, function(req, res){
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

router.get("/update-payment-:orderId", isAuth, isAdmin, function(req, res){
    const orderId = req.params.orderId;
    
    Order.findById({ _id: orderId }, function(err, order){
        if(err){
            console.log(err);
        } else {
            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            res.render('admin/update-payment', { order: order , fullName: req.session.firstName + " " + req.session.lastName });
        }
    });
});

router.post("/update-payment-:orderId", isAuth, isAdmin, function(req, res){
    const orderId = req.params.orderId;
    const {oldBalance, amountPaid, amountRemaining} = req.body;
    if(amountPaid > amountRemaining){
        res.redirect('/admin/orders/update-payment-' + orderId);
    }
    else{
        Order.findByIdAndUpdate(orderId, {$set: {amountPaid: parseInt(oldBalance) + parseInt(amountPaid), amountRemaining: amountRemaining-amountPaid}}, function(err, order){
            if(err){
                console.log(err);
            } else {
                res.redirect('/admin/orders');
            }
        });
    }
});

router.get("/view-payment-info-:orderId-:paymentId", isAuth, isAdmin, function(req, res){
    const orderId = req.params.orderId;
    const paymentId = req.params.paymentId;

    Order.findById(orderId, function(err, foundOrder){
        if(err){
            console.log(err);
        }
        else{
            const chosenPayment = foundOrder.paymentsInfo.find(obj => obj.id === paymentId);
            res.render('admin/view-payment-info', {fullName: req.session.firstName + " " + req.session.lastName, order: foundOrder, chosenPayment: chosenPayment});
        }
    });
});

module.exports = router;