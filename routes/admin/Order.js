const express = require('express');
const router = express.Router();

const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const Sale = require("../../models/salesModel");
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
                    $set:{'variations.$.quantity': 10 - quantity[i]}
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
                
                
            };  

            //Creating new sale object to be inserted to sales database.
            sale = new Sale({
                orderId: orderId,
                dateSold: order.dateCreated,
                earnings: order.amountPaid,
                items: items,
            });

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

                Product.findOneAndUpdate(conditions, update, function(err){
                    if(err){
                        console.log(err);
                    }
                });
            };  

            //Creating new sale object to be inserted to sales database.
            sale = new Sale({
                orderId: orderId,
                dateSold: order.dateCreated,
                earnings: order.amountPaid,
                items: items,
            });

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
    const{ orderId } = req.body;

    Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Refunded"}}, async function(err, order){
        if(err){
            console.log(err);
        } else {
            const itemId = [];

            //For updating variation quantity
            const variations = [];
            const quantity = [];
            const originalQuantity = [];

            //For updating total quantity sold and total earnings.
            const quantitySold = [];
            const earnings = []
            const originalTotalEarnings = [];
            const originalTotalQuantitySold = [];

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            
            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemId.push(cart.item._id);

                //Pushing the quantity and variation
                quantity.push(cart.qty);
                variations.push(cart.variation);

                //Pushing the quantity sold and earnings
                quantitySold.push(cart.qty);
                earnings.push(cart.price);
            });

            
            for(let i = 0; i < itemsLength; i++){
                let productObject = await Product.findOne({_id: itemId[i]});
                let productObjectVariations = productObject.variations;

                //Getting the original quantity per variation.
                const origQty = productObjectVariations.find(({ name }) => name == variations[i]);
                originalQuantity.push(origQty.quantity);
                
                //Getting the original total earnings and total quantity sold.
                let totalEarnings = productObject.totalEarnings;
                let totalQuantitySold = productObject.totalQuantitySold;

                originalTotalQuantitySold.push(totalQuantitySold);
                originalTotalEarnings.push(totalEarnings);
                
                const conditions = {
                    _id: itemId[i],
                    'variations.name': {$eq: variations[i]}
                };

                const update = {
                    $set:{'variations.$.quantity': originalQuantity[i] + quantity[i], totalEarnings : originalTotalEarnings[i] - earnings[i], totalQuantitySold : originalTotalQuantitySold[i] - quantitySold[i]}
                };

                //Adds back the subtracted quantity, subtracts from total earnings and total quantity sold.
                Product.findOneAndUpdate(conditions, update, function(err){
                    if(err){
                        console.log(err);
                    }
                });

                //Deletes the sale document.
                Sale.findOneAndDelete({ orderId: orderId }, function(err, sale){
                    if(err){ console.log(err) }
                }); 
            };  
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
    let paymentStatus;

    let balanceRemaining = amountRemaining-amountPaid;

    //Checks payment status.
    if(balanceRemaining > 0){
        paymentStatus = "Partially Paid";
    } else if (balanceRemaining == 0) {
        paymentStatus = "Fully Paid";
    }

    //Checks if amount paid exceeds amount remaining.
    if (amountPaid > amountRemaining) {
        res.redirect('/admin/orders/update-payment-' + orderId);
    } else {
        Order.findByIdAndUpdate(orderId, {$set: {amountPaid: parseInt(oldBalance) + parseInt(amountPaid), amountRemaining: balanceRemaining, paymentStatus: paymentStatus }}, function(err, order){
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

router.post('/shipping-:status', function(req, res){
    const status = req.params.status;
    const { orderId } = req.body;
    if(status == "Pending" || status == "Processing" || status == "In-transit" || status == "Delivered"){
        Order.findByIdAndUpdate(orderId, {$set: { shippingStatus: status }}, function(err, orders){
            if(err) {
                console.log(err)
            } else {
                res.redirect('/admin/orders');
            }
        });
    } else {
        res.redirect('/admin/orders');
    }
});

module.exports = router;