const express = require('express');
const router = express.Router();

var hbs = require('nodemailer-express-handlebars');
var path = require('path');
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

const sendStockMail = async function(email, productId, productName, productVariation, quantity, status){
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

        const handlebarOptions = {
            viewEngine: {
                extName: ".handlebars",
                partialsDir: path.resolve('./views'),
                defaultLayout: false
            },
            viewPath: path.resolve('./views'),
            extName: ".handlebars"
        }

        transporter.use('compile', hbs(handlebarOptions));
        
        const mailOptions= {
            from: {
                name: 'DapperDrops',
                address: process.env.SECRETEMAIL
            },
            from: process.env.SECRETEMAIL,
            to: email,
            subject: "Product - " + status,
            template: 'email-templates/stock-notification',
            context: {
                status: status,
                productId: productId,
                productName: productName,
                productVariation: productVariation,
                quantity: quantity
            }
            // html:'<p>Hi admin, Product ID: ' + productId + ', Product Name: ' +  productName + ' - Size: ' + productVariation + ' is now ' + status + '. It has a remaining quantity of ' + quantity + '.</p>'
        }

        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
            }
            else{
                console.log("Email stock information has been sent: ", info.response);
            }
        });
    }
    catch (error){
        console.log(error);
    }
}

router.get("/", isAuth, isAdmin, async function(req, res){
    const { stype, sdir } = req.query;
    const itemsArr = [];
    const orders = await Order.find({}).sort({ [stype] : sdir });

    for(let i = 0; i < orders.length; i++){
        cart = new Cart(orders[i].cart);
        items = cart.generateArray();
        itemsArr.push(items);
    }
        

    console.log(itemsArr);
    res.render('admin/orders/orders', {orders: orders, items: itemsArr, fullName: req.session.firstName + " " + req.session.lastName});
});

router.get('/status-:orderStatus', async function(req, res){
    const itemsArr = [];
    let orderStatus = req.params.orderStatus;
    const { stype, sdir } = req.query;
    let orders;

    if(orderStatus == "Pending" || orderStatus == "Confirmed" || orderStatus == "Completed" || orderStatus == "Declined" || orderStatus == "Refunded" || orderStatus == "Cancelled") {
        orders = await Order.find({ orderStatus: orderStatus }).sort({ [stype] : sdir });
    } else {
        res.redirect('/admin/orders/orders');
    }

    for(let i = 0; i < orders.length; i++){
        cart = new Cart(orders[i].cart);
        items = cart.generateArray();
        itemsArr.push(items);
    }

    res.render('admin/orders/orders-status',  {orders: orders, items: itemsArr, fullName: req.session.firstName + " " + req.session.lastName, orderStatus: orderStatus})
});

router.get('/search-orders', async function(req, res){
    const itemsArr = [];
    let query = req.query.query;
    const { stype, sdir } = req.query;

    if(!query) {
        query = "";
    }

    orders = await Order.find({
        $or: [
            { 'address.firstName' : { $regex: query, $options: "i" } },
            { 'address.lastName' : { $regex: query, $options: "i" } }
        ]
    }).sort({ [stype]: sdir });

    for(let i = 0; i < orders.length; i++){
        cart = new Cart(orders[i].cart);
        items = cart.generateArray();
        itemsArr.push(items);
    }

    res.render('admin/orders/search-orders', {orders: orders, items: itemsArr, fullName: req.session.firstName + " " + req.session.lastName, query: query});
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
            const itemName = [];
            const originalQuantity = [];
            const minusedValues = [];

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            let orderedList = Object.values(order.items);

            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemName.push(cart.item.brand + " " + cart.item.name);
                itemId.push(cart.item._id);
                quantity.push(cart.qty);
                variations.push(cart.variation);
            });

            let errorCount = 0;
            for(let i = 0; i < itemsLength; i++){
                let j = orderedList[i]; 
                
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
                            // console.log(productObject.name, "kokooo", j.item.name);
                            // console.log("AWITTT", itemId[i]);
                            if(j.item.name != productObject.name ||j.item.brand != productObject.brand||j.item.price != productObject.price){
                                errorCount++;
                            }
                        }
                    }
                }  
            };  

            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed or changed by admin.")
                res.redirect('/admin/orders');
            } else{
                console.log(minusedValues);
                let hasNegative = minusedValues.some(v => v < 0);
                let status = "";
                if(hasNegative){
                    res.redirect('/admin/orders');    
                } else{
                    Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Confirmed"}}, function(err, order){});
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
                            sendStockMail('dapperdrops@gmail.com', itemId[i], itemName[i], variations[i], minusedValues[i], status);
                        }
                        else{
                            status = "Out-of-Stock";
                            sendStockMail('dapperdrops@gmail.com', itemId[i], itemName[i], variations[i], minusedValues[i], status);
                        }

                        const update = {
                            $set:{
                                'variations.$.quantity': minusedValues[i],
                                'variations.$.status': status
                            }
                        };

                        Product.findOneAndUpdate(conditions, update, function(err){});
                    };
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

router.post("/cancel-order", isAuth, isAdmin, function(req, res){
    const{ orderId } = req.body;

    Order.findById(orderId, async function(err, order){
        if(err){
            console.log(err);
        } else {
            const variations = [];
            const quantity = [];
            const itemId = [];
            const itemName = [];
            const originalQuantity = [];
            const addedValues = [];

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            let orderedList = Object.values(order.items);
            
            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemName.push(cart.item.brand + " " + cart.item.name);
                itemId.push(cart.item._id);
                quantity.push(cart.qty);
                variations.push(cart.variation);
            });

            let errorCount = 0;
            //GET QUANTITY OF EACH SELECTED VARIATION
            for(let i = 0; i < itemsLength; i++){
                let j = orderedList[i]; 

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
                            if(j.item.name != productObject.name ||j.item.brand != productObject.brand||j.item.price != productObject.price){
                                errorCount++;
                            }
                        }
                    }
                }
            };

            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed or changed by admin.")
                res.redirect('/admin/orders');
            } else{
                let status = "";
                Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Cancelled"}}, function(err, order){});
                console.log(addedValues);
                for(let i = 0; i < itemsLength; i++){
                    if(addedValues[i] >= 6){
                        status = "In-Stock";
                    }else if(addedValues[i] <= 5 && addedValues[i] >=1){
                        status = "Few-Stocks";
                        sendStockMail('dapperdrops@gmail.com', itemId[i], itemName[i], variations[i], originalQuantity[i] - quantity[i], status);
                    }else{
                        status = "Out-of-Stock";
                        sendStockMail('dapperdrops@gmail.com', itemId[i], itemName[i], variations[i], originalQuantity[i] - quantity[i], status);
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
                res.redirect('/admin/orders');
            }
        }
    });
});

router.post("/complete-order", isAuth, isAdmin, function(req, res){
    const {orderId} = req.body;
    Order.findById(orderId, async function(err, order){
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

            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            let orderedList = Object.values(order.items);

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

            let errorCount = 0;
            //Updating the total sales and total quantity sold.
            for(let i = 0; i < itemsLength; i++){
                let j = orderedList[i]; 

                let productObject = await Product.findOne({_id: itemId[i]});
                if(!productObject){
                    errorCount++;
                } else{
                    let productObjectVariations = productObject.variations;
                    if(!productObjectVariations){
                        errorCount++;
                    } else{
                        if(j.item.name != productObject.name ||j.item.brand != productObject.brand||j.item.price != productObject.price){
                            errorCount++;
                        } 
                    }
                }
            };

            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed or changed by admin.")
                res.redirect('/admin/orders');
            } else{
                Order.findByIdAndUpdate(orderId, {$set: {orderStatus: "Completed"}}, async function(err, order){});
                for(let i = 0; i < itemsLength; i++){
                    const conditions = {
                        _id: itemId[i],
                    };
                    const update = {
                        $inc: { 
                            totalEarnings: earnings[i], 
                            totalQuantitySold: quantitySold[i] 
                        }
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
            const itemName = [];

            //For updating variation quantity
            const variations = [];
            const quantity = [];
            const originalQuantity = [];
            const addedValues = [];

            //For updating total quantity sold and total earnings.
            const quantitySold = [];
            const earnings = []
        
            const itemsLength = Object.keys(order.cart.items).length;

            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            let orderedList = Object.values(order.items);
            
            //Get product id and push it to itemId arr, get selected quantity per product and push it in quantity arr, get selected variation per product and push it in variations arr.
            order.items.forEach(function(cart){
                itemName.push(cart.item.brand + " " + cart.item.name);
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
                let j = orderedList[i]; 

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
                            if(j.item.name != productObject.name ||j.item.brand != productObject.brand||j.item.price != productObject.price){
                                errorCount++;
                            } 
                        }
                    }
                }
            };
            
            if(errorCount > 0){
                console.log("Order must be declined as an item or variation in order was removed or changed by admin.")
                res.redirect('/admin/orders');
            } else{
                let status = "";
                Order.findByIdAndUpdate(orderId, {$set : {orderStatus: "Refunded"}}, function(err, order){});
                for(let i = 0; i < itemsLength; i++){
                    if(addedValues[i] >= 6){
                        status = "In-Stock";
                    } else if(addedValues[i] <= 5 && addedValues[i] >=1){
                        status = "Few-Stocks";
                        sendStockMail('dapperdrops@gmail.com', itemId[i], itemName[i], variations[i], addedValues[i], status);
                    } else{
                        status = "Out-of-Stock";
                        sendStockMail('dapperdrops@gmail.com', itemId[i], itemName[i], variations[i], addedValues[i], status);
                    }
                    
                    const conditions = {
                        _id: itemId[i],
                        'variations.name': {$eq: variations[i]}
                    };
    
                    const update = {
                        $set:{
                            'variations.$.quantity': addedValues[i], 'variations.$.status': status
                        },
                        $inc:{
                            totalEarnings : -earnings[i], 
                            totalQuantitySold : -quantitySold[i]
                        }
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

    let balanceRemaining = parseInt(amountRemaining)-parseInt(amountPaid);

    //Checks payment status.
    if(balanceRemaining > 0){
        paymentStatus = "Partially Paid";
    } else if (balanceRemaining == 0) {
        paymentStatus = "Fully Paid";
    }

    //Checks if amount paid exceeds amount remaining.
    if (parseInt(amountPaid) > parseInt(amountRemaining)) {
        res.redirect('/admin/orders/update-payment-' + orderId);
    } else {
        Order.findByIdAndUpdate(orderId, {$set: {amountPaid: parseInt(oldBalance) + parseInt(amountPaid), amountRemaining: parseInt(balanceRemaining), paymentStatus: paymentStatus }}, function(err, order){
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

        const handlebarOptions = {
            viewEngine: {
                extName: ".handlebars",
                partialsDir: path.resolve('./views'),
                defaultLayout: false
            },
            viewPath: path.resolve('./views'),
            extName: ".handlebars"
        }
    
        transporter.use('compile', hbs(handlebarOptions));
        
        const mailOptions= {
            from: {
                name: 'DapperDrops',
                address: process.env.SECRETEMAIL
            },
            to: email,
            subject: "Shipping Information",
            template: 'email-templates/shipping',
            context: {
                name: name,
                orderId: orderID,
                company: company,
                track: track,
                shipLink: shipLink
            }
            // html:'<p>Hi ' + name + ', your order with the Order ID of ' + orderID + ' is now shipped through the company courier services of ' + company + ' please click at this link <a href="'+shipLink+'"> View Shipping Courier Services</a> and view details of your shipped order, by entering your received tracking number: ' + track + ' in the link.</p>'
        }

        transporter.use('compile', hbs(handlebarOptions));

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