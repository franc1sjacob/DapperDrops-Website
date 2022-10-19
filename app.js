require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const saltRounds = 10;

const nodemailer = require("nodemailer");
// const session = require("express-session");
const randomstring = require("randomstring");

const app = express();
const port = 3000 || process.env.PORT;

var fs = require('fs');
var path = require('path');

const multer = require("multer")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname)
    }
});
  

const upload = multer({
    storage: storage, 
}).single('productImage')


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:false
}));

app.use(bodyParser.json());
app.use(express.static("public"));



//MongoDB
main().catch(err => console.log(err));

async function main(){
    await mongoose.connect('mongodb://localhost:27017/dapperdropsDB');
    console.log("Connected to db!");
}

//Schemas
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        required: true
    },
    isVerified: {
        type: String,
        default: false
    },
    token: {
        type: String,
        default: ''
    }
});

const productSchema = new mongoose.Schema({
    brand: String,
    name: String,
    price: Number,
    description: String,
    quantity: Number,
});

//Models
const User = new mongoose.model("User", userSchema);
const Product = new mongoose.model("Product", productSchema);

app.get("/", function(req, res){
    res.render('index');
});

app.get("/onhand", function(req, res){
    Product.find({type:"On-Hand"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("onhand", { newOnHandProducts: allProducts })
        }
    });
});



app.get("/preorder", function(req, res){
    Product.find({type:"Pre-Order"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("preorder", { newPreOrderProducts: allProducts })
        }
    });
});

app.get("/accessories", function(req, res){
    Product.find({type:"Accessories"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("accessories", { newAccessoriesProducts: allProducts })
        }
    });
});

app.get("/apparel", function(req, res){
    Product.find({type:"Apparel"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("apparel", { newApparelProducts: allProducts })
        }
    });
});

app.get("/about", function(req, res){
    res.render('about');
});

app.get("/login", function(req, res){
    res.render('login');
});

app.post("/login", function(req, res){
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



app.get("/register", function(req, res){
    res.render('register');
});

app.post("/register", function(req, res){
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
            }
        });
        
        const mailOptions= {
            from: process.env.SECRETEMAIL,
            to: email,
            subject: "For Verification",
            html:'<p>Hi '+name+', please click here to <a href="http://localhost:3000/verify?id='+user_id+'"> Verify </a> your mail</p>'
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

app.get("/verify", function(req, res){
    User.findByIdAndUpdate({_id:req.query.id}, {$set:{isVerified: true}}, function(err, user){
        if(err){
            console.log(err);
        }
        else{
            res.render('email-verified');
        }
    });
});

app.get("/forgot", function(req, res){
    res.render('forgot');
});

app.post("/forgot", function(req, res){
    
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
            }
        });
        
        const mailOptions= {
            from: process.env.SECRETEMAIL,
            to: email,
            subject: "For Reset Password",
            html:'<p>Hi '+name+', please click here to <a href="http://localhost:3000/forget-password?token='+token+'"> Reset </a> your password.</p>'
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

app.get("/forget-password", function(req, res){
    const forgotToken = req.query.token;
    User.findOne({token: forgotToken}, function(err, foundToken){
        if(foundToken){
            res.render('forget-password', {userId: foundToken._id});
        } else {
            res.render('404', {message: "Token is invalid"});
        }
    });
});

app.post("/forget-password", function(req, res){
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

app.get("/admin/dashboard", function(req, res){
    res.render('admin/dashboard');
});

app.get("/admin/products", function (req, res) {   
    Product.find({}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/products', { newListProducts: allProducts })
        }
    });
});

app.get("/admin/add-product", function(req, res){
    res.render('admin/add-product');
});

app.post("/addProduct", upload,function(req, res){
    const product = new Product({
        brand: req.body.productBrand,
        name: req.body.productName,
        price: req.body.productPrice,
        description: req.body.productDescription,
        quantity: req.body.productQuantity,
        image: req.file.filename,
        type: req.body.productType
    });
    
    product.save(function(err){
        if(err){
            console.log(err);
        }
        res.redirect("/admin/products");
    });
});

app.get("/admin/onhand-products", function(req, res){
    res.render('admin/onhand-products');
});

app.get("/admin/preorder-products", function(req, res){
    res.render('admin/preorder-products');
});

app.get("/admin/apparel-products", function(req, res){
    res.render('admin/apparel-products');
});

app.get("/admin/accessories-products", function(req, res){
    res.render('admin/accessories-products');
});

app.get("/admin/inventory", function(req, res){
    res.render('admin/inventory');
});

app.get("/admin/orders", function(req, res){
    res.render('admin/orders');
});

app.get("/admin/accounts", function(req, res){
    User.find({}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.render('admin/accounts', {accounts: foundAccounts});
        }
    });
});

app.get("/upgrade-account", function(req, res){
    res.render('admin/accounts');
});

app.get("/downgrade-account", function(req, res){
    res.render('admin/accounts');
});

app.post("/upgrade-account", function(req, res){
    const upgradeId = req.body.upgradeId;
    User.findByIdAndUpdate(upgradeId, {$set: {accountType: "admin"}}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/accounts');
        }
    });
});

app.post("/downgrade-account", function(req, res){
    const downgradeId = req.body.downgradeId;
    User.findByIdAndUpdate(downgradeId, {$set: {accountType: "user"}}, function(err, foundAccounts){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/accounts');
        }
    });
});


app.listen(port, function(){
    console.log("Server started on port " + port);
});