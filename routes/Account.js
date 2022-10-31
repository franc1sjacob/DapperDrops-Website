const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
// const hbs = require('nodemailer-express-handlebars');

const randomstring = require("randomstring");

const User = require("../models/userModel");

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

router.get("/login", function(req, res){
    //Checks whether user is logged in or not.
    if(req.session.isAuth === true){
        res.redirect("/account/profile");
    } else {
        res.render('login');
    }

});

router.get("/profile", isAuth, function(req, res){
    userId = req.session.userId;
    User.findById(userId, function(err, user){
        res.render('profile', { user: user });
    });
});


router.post("/login", async function(req, res){
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if(!user){
        return res.render('login', { message: "The email you entered isn’t connected to an account."});
    }

    //Returns true if password matches.
    const isMatch = await bcrypt.compare(password, user.password);

    //Checks if isMatch is true
    if(!isMatch){
        return res.render('login', { message: "The password you’ve entered is incorrect. Forgot Password?"});
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
        return res.render('login', { message: "Please verify your account in your email."});
    }
});

router.post('/logout', function(req, res){
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect('/account/login');
        }
    });
});

router.get("/register", function(req, res){
    res.render('register');
});

router.post("/register", async function(req, res){
    const {
        firstName,
        lastName,
        email,
        password,
    } = req.body;

    let user = await User.findOne({ email });

    //Check if email exists
    if(user){
        return res.render('register', { message: "The email you've entered is already registered." });
    }

    //Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        accountType: 'user'
    });

    await user.save(function (err){
        if(err){
            console.log(err);
        } else {
            sendVerifyMail(firstName, email, user._id);
            res.render('register', {message: "Your registration has been successful. Please check your email and verify your account."});
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
        
        const mailOptions= {
            from: process.env.SECRETEMAIL,
            to: email,
            subject: "For Verification",
            html:'<p>Hi ' + name + ', please click here to <a href="http://localhost:3000/account/verify?id='+user_id+'"> Verify </a> your mail</p>'
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
    User.findByIdAndUpdate({ _id: req.query.id }, { $set:{ isVerified: true } }, function(err, user){
        if(err){
            console.log(err);
        } else {
            res.render('email-verified');
        }
    });
});

router.get("/forgot", function(req, res){
    res.render('forgot');
});

router.post("/forgot", function(req, res){
    const { email } = req.body;
    User.findOne({email: email}, function(err, user){
        if(user){
            if(user.isVerified === "false"){
                res.render('forgot', {message: "Please check your email and verify your account."});
            } else{
                const randomString = randomstring.generate();
                User.updateOne({email: forgotEmail}, {$set: {token: randomString}}, function(err, user){});
                sendResetPasswordMail(user.firstName, user.email, randomString);
                res.render('forgot', {message: "Please check your email for the reset link of forgotten password."});
            }
        } else {
            res.render('forgot', {message: "The email you entered isn’t connected to an account."});
        }
    });
});

const sendResetPasswordMail = async function(name, email, token){
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

        // transporter.use('compile', hbs({
        //     viewEngine: 'express-handlebars',
        //     viewPath: './views/'
        // }));
        
        const mailOptions = {
            from: process.env.SECRETEMAIL,
            to: email,
            subject: "Password Reset Request for DapperDrops",
            html:'<p>Hi '+name+', please click here to <a href="http://localhost:3000/account/forget-password?token='+token+'"> reset </a> your password.</p>'
            // template: 'forgotpass'
        }

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

router.get("/forget-password", function(req, res){
    const forgotToken = req.query.token;
    User.findOne({token: forgotToken}, function(err, foundToken){
        if(foundToken){
            res.render('forget-password', {userId: foundToken._id});
        } else {
            res.render('404', {message: "Token is invalid"});
        }
    });
});

router.post("/forget-password", async function(req, res){
    const { password, userId } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    User.findByIdAndUpdate({ _id: userId }, { $set: {password: hashedPassword}, token: ''}, function(err){
        if(err){
            console.log(err);
        } else {
            res.render('login', { message: "Your password is now reset, you can now login with your new password." });
        }
    });
});

router.get('/address', isAuth, function(req, res){
    const userId = req.session.userId;
    User.findById(userId, function(err, user){
        res.render('address', { user: user });
    });
});

router.post('/address', isAuth, async function(req, res){
    const userId = req.session.userId;
    const { fullName, phoneNumber, region, province, city, barangay, postalCode, streetName } = req.body;

    //Sets the address id.
    const addressId = new mongoose.Types.ObjectId();
    const address = {
        _id: addressId,
        fullName: fullName,
        phoneNumber: phoneNumber,
        region: region,
        province: province,
        city: city,
        barangay: barangay,
        postalCode: fullName,
        streetName: streetName
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
    })
});

module.exports = router;