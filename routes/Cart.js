const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Content = require("../models/contentModel");
const { ObjectID } = require('bson');

const isAuth = async function(req, res, next){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    if(req.session.isAuth){
        next();
    } else {
        res.render('login', { message: "Please login to your account to access this page.", content: content, isAdmin: isAdmin });
    }
}

router.get("/view-cart", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    if(!req.session.cart || req.session.cart.totalPrice === 0){
        res.render('view-cart', {usercart: null, content: content, isAdmin: isAdmin});
    } else {
        const cart = new Cart(req.session.cart);
        // res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty});
        res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty, isError:false, error:"", content: content, isAdmin: isAdmin });
    }
});

router.post("/add-to-cart", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    const { prodId, variation, quantity} = req.body;
    const selectQty = quantity;
    const selectVar = variation;
    // console.log(quantity);
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    try {
      
        let product = await Product.findById(prodId);
        product.variations.forEach((foundVariation)=>{
            // console.log(foundVariation,"variations found")
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
        res.render('view-item', {item: product, userId: userId,isError:true,error:error, content: content, isAdmin: isAdmin}); 
    }
    
});

router.post("/reduce-one", function(req, res){
    const isAdmin = req.session.isAdmin;
    const { prodId, variation } = req.body;
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.reduceByOne(prodId+variation);
    req.session.cart = cart;
    res.redirect('/cart/view-cart');
}); 

router.post("/add-one", function(req, res){
    const isAdmin = req.session.isAdmin;
    const { prodId, variation } = req.body;
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.addByOne(prodId+variation);
    req.session.cart = cart;
    res.redirect('/cart/view-cart');
}); 


router.post("/remove-item/:id/:variation", function(req, res){
    const isAdmin = req.session.isAdmin;
    const prodId = req.params.id;
    const variation = req.params.variation;
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.removeItem(prodId+variation);
    req.session.cart = cart;
    res.redirect('/cart/view-cart');
    
}); 

router.get("/checkout", isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    if(!req.session.cart){
        res.redirect('/cart/view-cart');
    }
    User.findById({ _id: userId },  async function(err, user){
        if(err){
            console.log(err);
        } else {

            try {
                const cart = new Cart(req.session.cart);
                var errorValues = [];
                let adminChanged = false;
                let cartItemList = Object.values(cart.items);
                console.log(cartItemList);
                
                for (let j = 0; j < cartItemList.length; j++) {
                    let i = cartItemList[j];           
                    const getProductCheck = await Product.findById({_id:i.item._id.valueOf()});
                    // console.log(getProductCheck, "getProductCheck");
                    // console.log('meeowwwwwwwwwwww',i.item._id);
                    if(!getProductCheck){
                        if(errorValues.length === 0){
                            errorValues.push("Item/s in cart were removed suddenly, please reload your cart and page"); 
                        }  
                    }
                    if(errorValues.length > 0){
                        throw errorValues
                    }
                    // console.log(i.item._id.valueOf(),i.item.name , getProductCheck.name ,i.item.brand , getProductCheck.brand,i.item.price , getProductCheck.price,i.item.description , getProductCheck.description)
                    if(i.item.name != getProductCheck.name ||i.item.brand != getProductCheck.brand||i.item.price != getProductCheck.price){
                        console.log(errorValues.length, 'errorValues');
                        if(errorValues.length === 0){
                            errorValues.push("Existing product/s in cart were changed by admin, please empty your cart or reload your page"); 
                        }   
                    }
                }
                
                if(errorValues.length > 0){
                    throw errorValues
                }
               
                Object.values(cart.items).forEach((foundProduct)=>{
                    foundProduct.item.variations.forEach((foundVariation)=>{                  
                        if(foundProduct.variation === foundVariation.name){
                            if(foundProduct.qty > foundVariation.quantity){
                                errorValues.push("Error In quantity of " + foundProduct.item.brand+" "+foundProduct.item.name+", "+"Size: "+foundProduct.variation+". ");
                            }
                        }
                    });
                })

                // Item Quantity for SHIPPING FEE CALCULATION
                req.session.itemQuantity = cart.totalQty;

                if(errorValues.length > 0){
                    throw errorValues
                }
                res.render('checkout', {usercart: cart.generateArray(), cart: cart, user: user, content: content, isAdmin: isAdmin});

            } catch (error) {
                console.log(error,"catching")
                const cart = new Cart(req.session.cart);
                if(error.includes("Item/s in cart were removed suddenly, please reload your cart and page")){
                    req.session.cart = "";
                }
                if(error.includes("Existing product/s in cart were changed by admin, please empty your cart or reload your page")){
                    req.session.cart = "";
                }
                res.render('view-cart', {usercart: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty, isError: true, error: error, content: content, isAdmin: isAdmin });
            }
        }
    })
});

router.post("/place-order", isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const orderId = new mongoose.Types.ObjectId();
    const { paymentMethod, termsCheckbox } = req.body;
    const userId = req.session.userId;
    const shippingFee = req.session.shippingFee;
    const cart = new Cart(req.session.cart);

    var today = new Date();

    if(termsCheckbox == "agree"){
        User.findById(userId, function(err, result){
            if(err){
                console.log(err);
            } else {

                console.log('tot', cart.totalPrice + shippingFee)
                const order = new Order({
                    _id: orderId,
                    userId: userId,
                    cart: cart,
                    address: result.defaultAddress,
                    paymentMethod: paymentMethod,
                    dateCreated: today,
                    shippingFee: shippingFee,
                    amountRemaining: cart.totalPrice + shippingFee
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
            res.render('checkout-confirmation', {usercart: cart.generateArray(), cart: cart, user: user, paymentMethod: req.session.paymentMethod, shippingFee: shippingFee, message: "Please read and accept the terms and conditions to proceed with your order.", content: content, isAdmin: isAdmin });
        });
    }
});

router.post('/add-new-address', isAuth, function(req, res){
    const isAdmin = req.session.isAdmin;
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
    const isAdmin = req.session.isAdmin;
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
            req.session.region = region;
            res.redirect('/cart/checkout-confirmation');
        }
    });
});

router.get('/checkout-confirmation', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;

    if(!req.session.cart || !req.session.region){
        res.redirect('/cart/view-cart');
    }

    //If NCR
    if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity == 1) {
        req.session.shippingFee = 150;
    } else if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity > 1 && req.session.itemQuantity <= 3){
        req.session.shippingFee = 350;
    } else if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity > 3 && req.session.itemQuantity <= 6){
        req.session.shippingFee = 550;
    } else if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity > 6 && req.session.itemQuantity <= 8){
        req.session.shippingFee = 750;
    } else if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity > 8 && req.session.itemQuantity <= 10){
        req.session.shippingFee = 950;
    } else if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity > 10 && req.session.itemQuantity <= 12){
        req.session.shippingFee = 1150;
    } else if(req.session.region == "NCR – National Capital Region" && req.session.itemQuantity > 12){
        req.session.shippingFee = 1350;
    //OTHER REGION BESIDE NCR
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity == 1) {
        req.session.shippingFee = 300;
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity > 1 && req.session.itemQuantity <= 3){
        req.session.shippingFee = 500;
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity > 3 && req.session.itemQuantity <= 6){
        req.session.shippingFee = 700;
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity > 6 && req.session.itemQuantity <= 8){
        req.session.shippingFee = 900;
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity > 8 && req.session.itemQuantity <= 10){
        req.session.shippingFee = 1100;
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity > 10 && req.session.itemQuantity <= 12){
        req.session.shippingFee = 1300;
    } else if(req.session.region != "NCR – National Capital Region" && req.session.itemQuantity > 12){
        req.session.shippingFee = 1500;
    } else {
        req.session.shippingFee = 2500;
    }

    User.findById({ _id: userId }, function(err, user){
        if(err){
            console.log(err);
        } else {
            const cart = new Cart(req.session.cart);
           
            res.render('checkout-confirmation', {usercart: cart.generateArray(), cart: cart, user: user, paymentMethod: req.session.paymentMethod, message: null, content: content, shippingFee: req.session.shippingFee, isAdmin: isAdmin});
        }
    })
});

router.get('/order-confirmed/:orderId', async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
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
            res.render('order-confirmed', { order: order, content: content, isAdmin: isAdmin });
        }
    });
});

module.exports = router;