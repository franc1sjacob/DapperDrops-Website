const express = require('express');
const router = express.Router();

const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const Inventory = require("../../models/inventoryModel");

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
    Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Confirmed"}}, async function(err, order){
        if(err){
            console.log(err);
        } else {
            const variations = [];
            const quantity = [];
            const itemId = [];
            const originalQuantity = [];

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            
            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemId.push(cart.item._id);
                quantity.push(cart.qty);
                variations.push(cart.variation);
            });

            
            for(let i = 0; i < itemsLength; i++){
                let productObject = await Product.findOne({_id: itemId[i]});
                let productObjectVariations = productObject.variations;

                //GET QUANTITY OF EACH SELECTED VARIATION
                const origQty = productObjectVariations.find(({ name }) => name == variations[i]);
                originalQuantity.push(origQty.quantity);
                
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

router.post("/completed-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Completed"}}, async function(err, order){
        if(err){
            console.log(err);
        } else {
            //For Sales DB
            let item;
            let items = [];

            //For updating product total quantity sold and total earnings.
            const quantitySold = [];
            const itemId = [];
            const earnings = []
            const originalTotalEarnings = [];
            const originalTotalQuantitySold = [];

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();

            //Getting product detail inside of cart.
            order.items.forEach(function(cart){
                //To be inserted in sales db.
                item = {
                    itemBrand: cart.item.brand,
                    itemName: cart.item.name,
                    itemPrice: cart.item.price,
                    itemVariation: cart.variation,
                    itemQuantity: cart.qty,
                    itemTotal: cart.price
                }

                items.push(item);
                itemId.push(cart.item._id);
                quantitySold.push(cart.qty);
                earnings.push(cart.price);
            });

            //Updating the total sales and total quantity sold.
            for(let i = 0; i < itemsLength; i++){

                let productObject = await Product.findOne({_id: itemId[i]});
                let totalEarnings = productObject.totalEarnings;
                let totalQuantitySold = productObject.totalQuantitySold;

                originalTotalQuantitySold.push(totalQuantitySold);
                originalTotalEarnings.push(totalEarnings);
    
                const conditions = {
                    _id: itemId[i],
                };
                const update = {
                    $set: { totalEarnings : originalTotalEarnings[i] + earnings[i], totalQuantitySold : originalTotalQuantitySold[i] + quantitySold[i] }
                };
                const inventoryUpdate = {
                    $set: { sales : originalTotalEarnings[i] + earnings[i], sold : originalTotalQuantitySold[i] + quantitySold[i] }
                };

                Product.findOneAndUpdate(conditions, update, function(err){
                    if(err){
                        console.log(err);
                    }
                });
                Inventory.findOneAndUpdate(conditions, inventoryUpdate, function(err){
                    if(err){
                        console.log(err);
                    }
                });
            };  

            //Creating new sale object to be inserted to sales database.
            // sale = new Sale({
            //     orderId: orderId,
            //     dateSold: order.dateCreated,
            //     earnings: order.amountPaid,
            //     items: items,
            // });

            // sale.save(function (err){
            //     if(err){
            //         console.log(err);
            //     } else {
            //         console.log("save success");
            //     }
            // });
        
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