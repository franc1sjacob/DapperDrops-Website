const express = require('express');
const router = express.Router();
var hbs = require('nodemailer-express-handlebars');

const mongoose = require('mongoose');

const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
// const hbs = require('nodemailer-express-handlebars');

const randomstring = require("randomstring");

const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Content = require("../models/contentModel");

var fs = require('fs');
var path = require('path');

const multer = require("multer")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/paymentProof')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname)
    }
});
  

const upload = multer({storage: storage,fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if(ext !== '.png' && ext !== '.jpg'  && ext !== '.jpeg' && ext !== '.jfif') {
        return callback(new Error('Only images are allowed'))
    }
    callback(null, true)
},
limits:{
    fileSize: 1024 * 1024
}}).single('paymentProof');

const cloudinary = require('cloudinary').v2;

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

router.get("/login", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    //Checks whether user is logged in or not.
    if(req.session.isAuth === true){
        res.redirect("/account/profile");
    } else {
        res.render('login', { content: content, isAdmin: isAdmin });
    }

});

router.get("/profile", isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    userId = req.session.userId;
    User.findById(userId, function(err, user){
        Order.find({ userId: userId }, function(err, orders){
            if(err){
                console.log(err);
            } else {
                orders.forEach(function(order) {
                    cart = new Cart(order.cart);
                    order.items = cart.generateArray();
                });
                res.render('profile/profile', { orders: orders, user: user, content: content, isAdmin: isAdmin });
            }
        });
        // res.render('profile', { user: user });
    });
});


router.post("/login", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if(!user){
        return res.render('login', { message: "The email you entered isn’t connected to an account.", content: content, isAdmin: isAdmin});
    }

    //Returns true if password matches.
    const isMatch = await bcrypt.compare(password, user.password);

    //Checks if isMatch is true
    if(!isMatch){
        return res.render('login', { message: "The password you’ve entered is incorrect. Forgot Password?", content: content, isAdmin: isAdmin});
    } else if(isMatch && user.isVerified === 'true'){
        req.session.firstName = user.firstName;
        req.session.lastName = user.lastName;
        req.session.userId = user._id;
        req.session.accountType = user.accountType;
        req.session.isAuth = true;
        if(req.session.accountType === "admin"){
            res.redirect('/admin/dashboard')
        } else {
            res.redirect('/account/profile');
        }
    } else {
        console.log("User account is correct but not verified.");
        return res.render('login', { message: "Please verify your account in your email.", content: content, isAdmin: isAdmin});
    }
});

router.post('/logout', isAuth, function(req, res){
    delete req.session.firstName;
    delete req.session.lastName;
    delete req.session.userId;
    delete req.session.accountType;
    delete req.session.isAuth;
    delete req.session.isAdmin;
    res.redirect('/account/login');
});

router.get("/register", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    if(req.session.isAuth === true){
        res.redirect("/account/profile");
    } else {
        res.render('register', { content: content, isAdmin: isAdmin });
    }
});

router.post("/register", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = new mongoose.Types.ObjectId();
    const { firstName, lastName, email, password } = req.body;

    let user = await User.findOne({ email });

    //Check if email exists
    if(user){
        return res.render('register', { message: "The email you've entered is already registered.", content: content, isAdmin: isAdmin});
    }

    //Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    user = new User({
        _id: userId,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        accountType: 'user'
    });

    wishlist = new Wishlist({
        userId: userId
    });
    wishlist.save();

    await user.save(function (err){
        if(err){
            console.log(err);
        } else {
            sendVerifyMail(firstName, email, user._id);
            res.render('register', {message: "Your registration has been successful. Please check your email and verify your account.", content: content, isAdmin: isAdmin});
        }
    });
});

const sendVerifyMail = async function(name, email, user_id){
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
            subject: "Account Verification",
            template: 'email-templates/register',
            context: {
                name: name,
                id: user_id
            }
            // html:'<p>Hi ' + name + ', please click here to <a href="https://dapperdrops.herokuapp.com/account/verify?id='+user_id+'"> Verify </a> your mail</p>'
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

router.get("/verify", function(req, res){
    User.findByIdAndUpdate({ _id: req.query.id}, { $set:{ isVerified: true } }, function(err, user){
        if(err){
            console.log(err);
        } else {
            res.redirect('/account/verified');
        }
    });
});

router.get('/verified', async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('email-verified', { content: content, isAdmin: isAdmin });
})

router.get("/forgot", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('forgot', { content: content, isAdmin: isAdmin });
});

router.post("/forgot", async function(req, res){
    const content = await Content.findOne({ status: 'active' });
    const { email } = req.body;
    User.findOne({email: email}, function(err, user){
        if(user){
            if(user.isVerified === "false"){
                res.render('forgot', {message: "Please check your email and verify your account.", content: content, isAdmin: isAdmin});
            } else{
                const randomString = randomstring.generate();
                User.updateOne({email: email}, {$set: {token: randomString}}, function(err, user){});
                sendResetPasswordMail(user.firstName, user.email, randomString);
                res.render('forgot', {message: "Please check your email for the reset link of forgotten password.", content: content, isAdmin: isAdmin});
            }
        } else {
            res.render('forgot', {message: "The email you entered isn’t connected to an account.", content: content, isAdmin: isAdmin});
        }
    });
});

const sendResetPasswordMail = async function(name, email, token){
    try {

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SECRETEMAIL,
                pass: process.env.SECRETPASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // transporter.use('compile', hbs({
        //     viewEngine: 'express-handlebars',
        //     viewPath: './views/'
        // }));

        const handlebarOptions = {
            viewEngine: {
                extName: ".handlebars",
                partialsDir: path.resolve('./views'),
                defaultLayout: false
            },
            viewPath: path.resolve('./views'),
            extName: ".handlebars"
        }
        
        const mailOptions = {
            from: {
                name: 'DapperDrops',
                address: process.env.SECRETEMAIL
            },
            to: email,
            subject: "Password Reset",
            template: 'email-templates/forgot-password',
            context: {
                name: name,
                token: token
            }
            // html:'<p>Hi '+name+', please click here to <a href="http://localhost:3000/account/forget-password?token='+token+'"> reset </a> your password.</p>'
        }

        transporter.use('compile', hbs(handlebarOptions));

        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
            } else {
                console.log("Email has been sent:- ", info.response);
            }
        });
    } catch(error) {
        console.log(error);
    }
}

router.get("/forget-password", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const forgotToken = req.query.token;
    User.findOne({token: forgotToken}, function(err, foundToken){
        if(foundToken){
            res.render('forget-password', {userId: foundToken._id, content: content, isAdmin: isAdmin});
        } else {
            res.render('404', {message: "Token is invalid", content: content, isAdmin: isAdmin});
        }
    });
});

router.post("/forget-password", async function(req, res){
    const content = await Content.findOne({ status: 'active' });
    const { password, userId } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    User.findByIdAndUpdate({ _id: userId }, { $set: {password: hashedPassword}, token: ''}, function(err){
        if(err){
            console.log(err);
        } else {
            res.render('login', { message: "Your password is now reset, you can now login with your new password.", content: content, isAdmin: isAdmin });
        }
    });
});

router.get('/address', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    User.findById(userId, function(err, user){
        res.render('profile/address', { user: user, content: content, isAdmin: isAdmin});
    });
});

router.post('/address', isAuth, function(req, res){
    const userId = req.session.userId;
    const addressId = new mongoose.Types.ObjectId();
    const { firstName, lastName, addressLine, region, city, postalCode, barangay, phoneNumber, email } = req.body;

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
                    res.redirect('/account/profile');
                }
            });
        }
    });
});

router.post('/setDefaultAddress/:addressId&:firstName&:lastName&:addressLine&:region&:city&:postalCode&:barangay&:phoneNumber&:email', isAuth, function(req, res){
    const { addressId, firstName, lastName, addressLine, region, city, postalCode, barangay, phoneNumber, email } = req.params;
    const newDefaultAddress = {
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
    const userId = req.session.userId;
    User.findByIdAndUpdate({ _id: userId }, { $set:{ defaultAddress: newDefaultAddress }}, function(err, user){
        if(err){
            console.log(err);
        } else {
            res.redirect('/account/profile');
        }
    });
})

router.post('/deleteAddress/:addressId', isAuth, function(req, res){
    const userId = req.session.userId;
    const addressId = req.params.addressId;

    User.findByIdAndUpdate({ "_id": userId },
    { $pull: { 
        addresses: { _id: addressId }
    }}, function(err, user){
        if(err){
            console.log(err);
        } else {

            const objAddressId = mongoose.Types.ObjectId(addressId);
            const isEqual = objAddressId.equals(user.defaultAddress._id);

            //Checks if default address id is equal to address id of selected address.
            if(isEqual){
                //Unsets the values of default address if this specific address is deleted.
                User.findByIdAndUpdate({ "_id": userId }, { $unset: { defaultAddress: 1}}, function(err){
                    if(err){
                        console.log(err);
                    }
                });
            }
            res.redirect('/account/address');
        }
    });
});


router.get('/wishlist', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    let product;
    let items = [];
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    const wishlist = await Wishlist.findOne({ userId: userId })

    if(wishlist != null){
        for(let i = 0; i < wishlist.products.length; i++){
            foundProduct = await Product.findById(wishlist.products[i].productId);
            if(foundProduct == null) {
                nullProduct = {
                    _id: wishlist.products[i].productId,
                    brand: "Unavailable",
                    name: "Product Removed",
                    price: 0,
                    image: {
                        url: "/images/icons/productRemovedImg.jpg"
                    }
                }
                items.push(nullProduct);
            } else {
                items.push(foundProduct);
            }
        }
        res.render('profile/wishlist', { wishlist: wishlist, items: items, content: content, isAdmin: isAdmin });
    } else {
        res.render('profile/wishlist', { wishlist: wishlist, items: items, content: content, isAdmin: isAdmin });
    }
    
    
});

router.post('/delete-wishlist', isAuth, function(req, res){
    const userId = req.session.userId;
    const wishlistId = req.body.wishlistId
    Wishlist.findOneAndUpdate({ userId: userId },
    { $pull: { 
        products: { _id: wishlistId }
    }}, function(err, user){
        if(err){
            console.log(err);
        } else {
            res.redirect('/account/wishlist');
        }
    });
});

router.get('/view-orders', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    Order.find({ userId: userId }, function(err, orders){
        if(err){
            console.log(err);
        } else {
            orders.forEach(function(order) {
                cart = new Cart(order.cart);
                order.items = cart.generateArray();
            });
            res.render('profile/view-orders', { orders: orders, status: null, content: content, isAdmin: isAdmin });
        }
    });
});

router.get('/view-orders-:status', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    const orderStatus = req.params.status;
    if(orderStatus == "Completed" || orderStatus == "Confirmed" || orderStatus == "Pending" || orderStatus == "Declined" || orderStatus == "Refunded" || orderStatus == "Cancelled"){
        Order.find({ userId: userId, orderStatus: orderStatus }, function(err, orders){
            if(err){
                console.log(err);
            } else {
                orders.forEach(function(order) {
                    cart = new Cart(order.cart);
                    order.items = cart.generateArray();
                });
                res.render('profile/view-orders', { orders: orders, status: orderStatus, content: content, isAdmin: isAdmin });
            }
        });
    } else {
        res.redirect('/account/view-orders');
    }
});

router.get('/view-order/:orderId', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const orderId = req.params.orderId;
    Order.findById({ _id: orderId }, function(err, order){
        if(err){
            console.log(err);
        } else {
            cart = new Cart(order.cart);
            order.items = cart.generateArray();
            res.render('profile/view-order', { order: order, content: content, isAdmin: isAdmin });
        }
    });
});


router.get('/change-password', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('profile/change-password', { errorMessage: null, successMessage: null, content: content, isAdmin: isAdmin });
});

router.post('/change-password', isAuth, async function(req, res){
    const content = await Content.findOne({ status: 'active' });
    const userId = req.session.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById({ _id: userId });

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if(newPassword != confirmPassword){
        return res.render('profile/change-password', { errorMessage: "Your new password does not match your confirm password.", successMessage: null, content: content, isAdmin: isAdmin});
        
    } else if(!isMatch){
        return res.render('profile/change-password', { errorMessage: "The old password you entered is incorrect.", successMessage: null, content: content, isAdmin: isAdmin});

    } else {
        const newHashedPassword = await bcrypt.hash(newPassword, 12);

        User.findOneAndUpdate({_id: userId}, { $set: {password: newHashedPassword} }, function(err){
            if(err){
                console.log(err);
            } else {
                res.render('profile/change-password', { successMessage: "Your password has successfully been changed!", errorMessage: null, content: content, isAdmin: isAdmin});
            }
        });
    }
});

router.get("/send-payment-proof/:orderId", isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const orderId = req.params.orderId;
    Order.findById(orderId, function(err, foundOrder){
        if(err){
            console.log(err);
        }
        else{
            res.render('profile/send-payment-proof', {order: foundOrder, content: content, isAdmin: isAdmin});
        }
    });
});

router.post("/send-payment-proof/:orderId", isAuth, upload, async function(req, res){
    const {description} = req.body;
    const orderId = req.params.orderId;
    const result = await cloudinary.uploader.upload(req.file.path,{
        folder: "proofOfPayment",
    })

    const paymentInfo = {
        paymentDescription: description,
        paymentProof: {
            public_id: result.public_id,
            url: result.secure_url
        },
    };

    Order.findByIdAndUpdate(orderId, { $push: { paymentsInfo: [paymentInfo]}},  function(err, result){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/account/profile');
        }
    });
});

router.get("/view-payment-info-:orderId-:paymentId", isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const orderId = req.params.orderId;
    const paymentId = req.params.paymentId;

    Order.findById(orderId, function(err, foundOrder){
        if(err){
            console.log(err);
        }
        else{
            const chosenPayment = foundOrder.paymentsInfo.find(obj => obj.id === paymentId);
            res.render('profile/view-payment-info', {order: foundOrder, chosenPayment: chosenPayment, content: content, isAdmin: isAdmin});
        }
    });
});

router.get('/send-feedback-:orderId-:status', isAuth, async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    const { orderId, status } = req.params;
    if(status != "Completed"){
        res.redirect('/account/view-orders');
    } else {
        res.render('profile/send-feedback', { orderId: orderId, content: content, isAdmin: isAdmin });
    }

});

router.post('/send-feedback-:orderId', isAuth, function(req, res){
    const orderId = req.params.orderId;
    const { feedbackMessage, feedbackRate } = req.body;
    Order.findByIdAndUpdate({_id: orderId}, { $set: { feedbackMessage: feedbackMessage, feedbackRate: feedbackRate }}, function(err, order){
        if(err) {
            console.log(err);
        } else {
            console.log("Feedback sent!", orderId)
            res.redirect('/account/profile');
        }
    });

});

router.post('/cancel-customer/:orderId', isAuth, function(req, res){
    const orderId = req.params.orderId;
    Order.findByIdAndUpdate({_id: orderId}, {$set : {orderStatus: "Cancelled by Customer"}}, function(err, order){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/account/profile');
        }
    });
});

module.exports = router;