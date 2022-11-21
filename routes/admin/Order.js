const express = require('express');
const router = express.Router();
const nodemailer = require("nodemailer");

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

router.get("/", isAuth, isAdmin, async function(req, res){
    const { stype, sdir } = req.query;
    const orders = await Order.find({}).sort({ [stype] : sdir });
    res.render('admin/orders/orders', {orders: orders, fullName: req.session.firstName + " " + req.session.lastName});
});

router.get('/status-:orderStatus', async function(req, res){
    let orderStatus = req.params.orderStatus;
    const { stype, sdir } = req.query;
    let orders;

    if(orderStatus == "Pending" || orderStatus == "Confirmed" || orderStatus == "Completed" || orderStatus == "Declined" || orderStatus == "Refunded" || orderStatus == "Cancelled") {
        orders = await Order.find({ orderStatus: orderStatus }).sort({ [stype] : sdir });
    } else {
        res.redirect('/admin/orders/orders');
    }

    res.render('admin/orders/orders-status',  {orders: orders, fullName: req.session.firstName + " " + req.session.lastName, orderStatus: orderStatus})
});

router.get('/search-orders', async function(req, res){
    let query = req.query.query;
    const { stype, sdir } = req.query;

    if(!query) {
        query = "";
    }

    orders = await Order.find({
        $or: [
            { 'address.firstName' : { $regex: query, $options: "i" } }
        ]
    }).sort({ [stype]: sdir });

    res.render('admin/orders/search-orders', {orders: orders, fullName: req.session.firstName + " " + req.session.lastName, query: query});
});

router.post("/confirm-order", isAuth, isAdmin, function(req, res){
    const{ orderId } = req.body;
    Order.findById(orderId, async function(err, order){
        if(err){
            console.log(err);
        } else{
            const variations = [];
            const quantity = [];
            const itemId = [];
            const originalQuantity = [];
            const minusedValues = [];

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            
            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemId.push(cart.item._id);
                quantity.push(cart.qty);
                variations.push(cart.variation);
            });

            let errorCount = 0;
            
            for(let i = 0; i < itemsLength; i++){
                let productObject = await Product.findOne({_id: itemId[i]});
                if(!productObject){
                    errorCount++;
                } else{
                    let productObjectVariations = productObject.variations;
                    if(!productObjectVariations){
                        errorCount++;
                    } else{
                        //GET QUANTITY OF EACH SELECTED VARIATION
                        const origQty = productObjectVariations.find(({ name }) => name == variations[i]);
                        if(!origQty){
                            errorCount++;
                        } else{
                            originalQuantity.push(origQty.quantity);
                            minusedValues.push(originalQuantity[i] - quantity[i]);
                        }
                 
                    }
                }  
            };  

            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed by admin.")
                res.redirect('/admin/orders');
            } else{
                console.log(minusedValues);
                let hasNegative = minusedValues.some(v => v < 0);
                let status = "";
                if(hasNegative){
                    res.redirect('/admin/orders');    
                } else{
                    for(let i = 0; i < itemsLength; i++){
                        const conditions = {
                            _id: itemId[i],
                            'variations.name': {$eq: variations[i]}
                        };
                        
                        if(minusedValues[i] >= 6){
                            status = "In-Stock";
                        }
                        else if(minusedValues[i] <= 5 && minusedValues[i] >=1){
                            status = "Few-Stocks";
                        }
                        else{
                            status = "Out-of-Stock";
                        }

                        const update = {
                            $set:{
                                'variations.$.quantity': minusedValues[i],
                                'variations.$.status': status
                            }
                        };

                        Product.findOneAndUpdate(conditions, update, function(err){});
                    };
                    Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Confirmed"}}, function(err, order){});
                    res.redirect('/admin/orders');
                }
            }
        }
    });
});

router.post("/pending-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Pending"}}, async function(err, order){
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

    Order.findById(orderId, async function(err, order){
        if(err){
            console.log(err);
        } else {
            const variations = [];
            const quantity = [];
            const itemId = [];
            const originalQuantity = [];
            const addedValues = [];

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

            let errorCount = 0;
            //GET QUANTITY OF EACH SELECTED VARIATION
            for(let i = 0; i < itemsLength; i++){
                let productObject = await Product.findOne({_id: itemId[i]});
                if(!productObject){
                    errorCount++;
                } else{
                    let productObjectVariations = productObject.variations;
                    if(!productObjectVariations){
                        errorCount++;
                    } else{
                        const origQty = productObjectVariations.find(({ name }) => name == variations[i]);
                        if(!origQty){
                            errorCount++;
                        } else{
                            originalQuantity.push(origQty.quantity);
                            addedValues.push(originalQuantity[i] + quantity[i]); 
                        }
                    }
                }
            };

            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed by admin.")
                res.redirect('/admin/orders');
            } else{
                let status = "";
                for(let i = 0; i < itemsLength; i++){
                    if(addedValues[i] >= 6){
                        status = "In-Stock";
                    }else if(addedValues[i] <= 5 && addedValues[i] >=1){
                        status = "Few-Stocks";
                    }else{
                        status = "Out-of-Stock";
                    }
    
                    const conditions = {
                        _id: itemId[i],
                        'variations.name': {$eq: variations[i]}
                    };
    
                    const update = {
                        $set:{
                            'variations.$.quantity': addedValues[i],
                            'variations.$.status': status
                        }
                    };
                    Product.findOneAndUpdate(conditions, update, function(err){});
                };
                Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Cancelled"}}, function(err, order){});
                res.redirect('/admin/orders');
            }
        }
    });
});

router.post("/refund-order", isAuth, isAdmin, function(req, res){
    const{ orderId } = req.body;

    Order.findById(orderId, async function(err, order){
        if(err){
            console.log(err);
        } else {
            const itemId = [];

            //For updating variation quantity
            const variations = [];
            const quantity = [];
            const originalQuantity = [];
            const addedValues = [];

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

            let errorCount = 0;

            for(let i = 0; i < itemsLength; i++){
                let productObject = await Product.findOne({_id: itemId[i]});
                if(!productObject){
                    errorCount++;
                }else{
                    let productObjectVariations = productObject.variations;
                    if(!productObjectVariations){
                        errorCount++;
                    }else{
                        //Getting the original quantity per variation.
                        const origQty = productObjectVariations.find(({ name }) => name == variations[i]);
                        if(!origQty){
                            errorCount++;
                        }else{
                            originalQuantity.push(origQty.quantity);
                            addedValues.push(originalQuantity[i] + quantity[i]); 
                        }
                    }
                }
            };

            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed by admin.")
                res.redirect('/admin/orders');
            }else{
                let status = "";
                for(let i = 0; i < itemsLength; i++){
                    //Getting the original total earnings and total quantity sold.
                    let totalEarnings = productObject.totalEarnings;
                    let totalQuantitySold = productObject.totalQuantitySold;

                    originalTotalQuantitySold.push(totalQuantitySold);
                    originalTotalEarnings.push(totalEarnings);

                    if(addedValues[i] >= 6){
                        status = "In-Stock";
                    } else if(addedValues[i] <= 5 && addedValues[i] >=1){
                        status = "Few-Stocks";
                    } else{
                        status = "Out-of-Stock";
                    }
                    
                    const conditions = {
                        _id: itemId[i],
                        'variations.name': {$eq: variations[i]}
                    };

                    const update = {
                        $set:{
                            'variations.$.quantity': addedValues[i], 'variations.$.status': status, totalEarnings : originalTotalEarnings[i] - earnings[i], totalQuantitySold : originalTotalQuantitySold[i] - quantitySold[i]}
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
                Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Refunded"}}, function(err, order){});
                res.redirect('/admin/orders');
            }
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

router.post('/shipping-:status', isAuth, isAdmin, function(req, res){
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

router.get("/send-ship-mail-:orderId", isAuth, isAdmin, function(req, res){
    const orderId = req.params.orderId;
    console.log()
    Order.findById(orderId, function(err, foundOrder){
        if(err){
            console.log(err);
        }
        else{
            res.render('admin/send-ship-mail', {fullName: req.session.firstName + " " + req.session.lastName, order: foundOrder});
        }
    });
});

router.post("/send-mail-shipped-:orderId", isAuth, isAdmin, async function(req, res){
    const orderId = req.params.orderId;
    const{shippingCompany, trackNumber, shippingLink} = req.body;
    Order.findById((orderId), function(err, foundOrder){
        if(err){
            console.log(err);
        }
        else{
            User.findById(foundOrder.userId, function(err, foundUser){
                if(err){
                    console.log(err);
                }
                else{
                    sendShippingMail(foundUser.firstName, foundUser.email, foundOrder._id, shippingCompany, trackNumber, shippingLink);
                    console.log(foundUser.firstName + foundUser.email);
                    res.redirect('/admin/orders');
                }
            });
        }
    });
});

const sendShippingMail = async function(name, email, orderID, company, track, shipLink){
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth:{
                user: process.env.SECRETEMAIL,
                pass: process.env.SECRETPASSWORD
            },
            tls:{
                rejectUnauthorized: false
            }
        });
        
        const mailOptions= {
            from: process.env.SECRETEMAIL,
            to: email,
            subject: "Tracking Order",
            html:'<p>Hi ' + name + ', your order with the Order ID of ' + orderID + ' is now shipped through the company courier services of ' + company + ' please click at this link <a href="'+shipLink+'"> View Shipping Courier Services</a> and view details of your shipped order, by entering your received tracking number: ' + track + ' in the link.</p>'
        }

        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
            }
            else{
                console.log("Email has been sent:- ", info.response);
            }
        });
    }
    catch (error){
        console.log(error);
    }
}

module.exports = router;