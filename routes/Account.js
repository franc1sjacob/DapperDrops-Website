const express = require('express');
const router = express.Router();

const bcrypt = require("bcrypt");
const saltRounds = 10;
const nodemailer = require("nodemailer");

const randomstring = require("randomstring");

const User = require("../models/userModel");

router.get("/login", function(req, res){
    res.render('login');
});

router.post("/login", function(req, res){
    const userEmail = req.body.email;
    const userPassword = req.body.password;
    
    User.findOne({email: userEmail}, function(err, foundUser){
        if(err){
            console.log(err);
        } else {
            if(foundUser){
                bcrypt.compare(userPassword, foundUser.password, function(err, result){
                    if(result === true){
                        if(foundUser.isVerified === "false"){
                            res.render('login', {message: "Please check and verify your account in your email."});
                        }
                        else if(foundUser.accountType === "admin"){
                            // req.session.userId = foundUser._id;
                            res.render('admin/dashboard');
                        }
                        else{
                            // req.session.userId = foundUser._id;
                            res.render('index');
                        }
                    }
                    else{
                        res.render('login', {message: "Incorrect login credentials!"});
                    }
                });
            }
            else{
                res.render('login', {message: "Incorrect email and password!"});
            }
        }});
});

router.get("/register", function(req, res){
    res.render('register');
});

router.post("/register", function(req, res){
    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        const user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hash,
            accountType: "user"
        });
    
        user.save(function(err){
            if(err){
                console.log(err);
            } else {
                sendVerifyMail(req.body.firstName, req.body.email, user._id);
                res.render('register', {message: "Your registration has been successful. Please check and verify your account."});
            }
        });
    });
});

const sendVerifyMail = async(name, email, user_id) =>{
    try{
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port:465,
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
            html:'<p>Hi '+name+', please click here to <a href="http://localhost:3000/account/verify?id='+user_id+'"> Verify </a> your mail</p>'
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
    User.findByIdAndUpdate({_id:req.query.id}, {$set:{isVerified: true}}, function(err, user){
        if(err){
            console.log(err);
        }
        else{
            res.render('email-verified');
        }
    });
});

router.get("/forgot", function(req, res){
    res.render('forgot');
});

router.post("/forgot", function(req, res){
    
    const forgotEmail = req.body.email;
    User.findOne({email: forgotEmail}, function(err, foundUser){
        if(foundUser){
            if(foundUser.isVerified === "false"){
                res.render('forgot', {message: "Please check and verify your email."});
            } else{
                const randomString = randomstring.generate();
                User.updateOne({email: forgotEmail}, {$set: {token: randomString}}, function(err, user){});
                sendResetPasswordMail(foundUser.firstName, foundUser.email, randomString);
                res.render('forgot', {message: "Please check your email for the reset link of forgotten password."});
            }
        } else {
            res.render('forgot', {message: "User email is incorrect."});
        }
    });
});

const sendResetPasswordMail = async(name, email, token) =>{
    try{
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port:465,
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
            subject: "For Reset Password",
            html:'<p>Hi '+name+', please click here to <a href="http://localhost:3000/account/forget-password?token='+token+'"> Reset </a> your password.</p>'
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

router.post("/forget-password", function(req, res){
    const newPassword = req.body.password;
    const userId = req.body.userId;

    bcrypt.hash(newPassword, saltRounds, function(err, hash){
        User.findByIdAndUpdate({_id: userId}, {$set: {password: hash}, token:''}, function(err, user){
            if(err){
                console.log(err);
            }
            else{
                res.render('login', {message: "Your password is now reset, you can now login."});
            }
        });
    });
});

module.exports = router;