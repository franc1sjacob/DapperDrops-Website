const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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
    if(!req.session.cart || req.session.cart.totalPrice === 0){
        res.render('view-cart', {usercart: null});
    } else{
        const cart = new Cart(req.session.cart);
        // res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty});
        res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty,isError:false,error:""});
    }
});

router.post("/add-to-cart", async function(req, res){
    const userId = req.session.userId;
    const { prodId, variation, quantity} = req.body;
    const selectQty = quantity;
    const selectVar = variation;
    // console.log(quantity);
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    try {
      
        let product = await Product.findById(prodId);
        product.variations.forEach((foundVariation)=>{
            console.log(foundVariation,"variations found")
            if(foundVariation.name === selectVar && selectQty > foundVariation.quantity){
                console.log("error found , throw now");
                throw "Some items became available. Update the quantity and try again."
            }
        })

        cart.add(product, product._id+selectVar, selectQty, selectVar);
        req.session.cart = cart;
        res.redirect('/cart/view-cart');

    } catch (error) {
        let product = await Product.findById(prodId)
        res.render('view-item', {item: product, userId: userId,isError:true,error:error}); 
    }
    
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
    const userId = req.session.userId;
    if(!req.session.cart){
        res.redirect('/cart/view-cart');
    }
    User.findById({ _id: userId }, function(err, user){
        if(err){
            console.log(err);
        } 
        else 
        {
            try 
            {
                const cart = new Cart(req.session.cart);
                var errorValues = [];
                console.log(Object.values(cart.items),"item bhenchod");
                Object.values(cart.items).forEach((foundProduct)=>{
                    console.log("variations find",foundProduct.variation,foundProduct.qty,foundProduct.item.name);
                    foundProduct.item.variations.forEach((foundVariation)=>{                   
                        if(foundProduct.variation === foundVariation.name){
                            if(foundProduct.qty > foundVariation.quantity){
                                console.log(foundVariation,'oh yeah');
                                errorValues.push(foundProduct.item.brand+" "+foundProduct.item.name+", "+"Size: "+foundProduct.variation+" ");
                                console.log("MATCHED ERROR" ,foundProduct.qty,foundVariation.quantity );   
                            }
                        }
                    });
                })
                console.log(errorValues.length,"error valuesss");
                if(errorValues.length > 0){
                    throw errorValues
                }
                
                res.render('checkout', {usercart: cart.generateArray(), cart: cart, user: user});
            } 
            catch (error) 
            {
                console.log(error,"catch")
                const cart = new Cart(req.session.cart);
                res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty,isError:true,error:error});

            }
        }
    })
});

router.post("/place-order", isAuth, function(req, res){
    const orderId = new mongoose.Types.ObjectId();
    const { paymentMethod, termsCheckbox } = req.body;
    const userId = req.session.userId;
    const cart = new Cart(req.session.cart);

    var today = new Date();

    if(termsCheckbox == "agree"){
        User.findById(userId, function(err, result){
            if(err){
                console.log(err);
            } else {
                const order = new Order({
                    _id: orderId,
                    userId: userId,
                    cart: cart,
                    address: result.defaultAddress,
                    paymentStatus: "Pending",
                    orderStatus: "Pending",
                    paymentMethod: paymentMethod,
                    dateCreated: today,
                    amountPaid: 0,
                    amountRemaining: cart.totalPrice
                });
            
                order.save(function(err, result){
                    if(err){
                        console.log(err);
                    }
                    else{
                        req.session.cart = null;
                        res.redirect('/cart/order-confirmed/' + orderId);
                    }
                });
            }
        });
    } else {
        User.findById({ _id: userId }, function(err, user){
            res.render('checkout-confirmation', {usercart: cart.generateArray(), cart: cart, user: user, paymentMethod: req.session.paymentMethod, message: "Please read and accept the terms and conditions to proceed with your order."});
        });
    }
});

router.post('/add-new-address', isAuth, function(req, res){
    const userId = req.session.userId;
    const addressId = new mongoose.Types.ObjectId();
    const { firstName, lastName, addressLine, region, city, postalCode, barangay, phoneNumber, email, paymentMethod } = req.body;
    const address = {
        _id: addressId,
        firstName: firstName,
        lastName: lastName,
        addressLine: addressLine,
        region: region,
        city: city,
        postalCode: postalCode,
        barangay: "Brgy " + barangay,
        phoneNumber: phoneNumber,
        email: email
    };
    User.findByIdAndUpdate({ "_id": userId }, { $push: { 
        addresses: [address]
    }}, function(err){
        if(err){
            console.log(err);
        } else {
            //Sets the newly added address as default address.
            User.findByIdAndUpdate({ _id: userId }, { $set: { defaultAddress: address } }, function(err, user){
                if(err){
                    console.log(err);
                } else {
                    req.session.paymentMethod = paymentMethod;
                    res.redirect('/cart/checkout-confirmation');
                }
            });
        }
    });
});

router.post('/add-default-address', isAuth, function(req, res){
    const userId = req.session.userId;
    const addressId = new mongoose.Types.ObjectId();
    const { firstName, lastName, addressLine, region, city, postalCode, barangay, phoneNumber, email, paymentMethod } = req.body;
    const address = {
        _id: addressId,
        firstName: firstName,
        lastName: lastName,
        addressLine: addressLine,
        region: region,
        city: city,
        postalCode: postalCode,
        barangay: barangay,
        phoneNumber: phoneNumber,
        email: email
    };
    User.findByIdAndUpdate({ _id: userId }, { $set: { defaultAddress: address } }, function(err, user){
        if(err){
            console.log(err);
        } else {
            const cart = new Cart(req.session.cart);
            req.session.paymentMethod = paymentMethod;
            res.redirect('/cart/checkout-confirmation');
        }
    });
});

router.get('/checkout-confirmation', isAuth, function(req, res){
    const userId = req.session.userId;
    if(!req.session.cart){
        res.redirect('/cart/view-cart');
    }
    User.findById({ _id: userId }, function(err, user){
        if(err){
            console.log(err);
        } else {
            const cart = new Cart(req.session.cart);
           
            res.render('checkout-confirmation', {usercart: cart.generateArray(), cart: cart, user: user, paymentMethod: req.session.paymentMethod, message: null});
        }
    })
});

router.get('/order-confirmed/:orderId', function(req, res){
    const orderId = req.params.orderId
    if(orderId == undefined){
        res.redirect('/cart/view-cart');
    }
    Order.findById({ _id: orderId }, function(err, order){
        if(err){
            console.log(err);
        } else {
            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            res.render('order-confirmed', { order: order });
        }
    });
});

module.exports = router;