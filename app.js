require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const saltRounds = 10;

const nodemailer = require("nodemailer");

const app = express();
const port = 3000 || process.env.PORT;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:true
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
    res.render('onhand');
});

app.get("/preorder", function(req, res){
    res.render('preorder');
});

app.get("/accessories", function(req, res){
    res.render('accessories');
});

app.get("/apparel", function(req, res){
    res.render('apparel');
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
                            res.render('admin/dashboard');
                        }
                        else{
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
                user: "sammygarma26@gmail.com",
                pass: "qglbjuxabnylswro"
            }
        });
        
        const mailOptions= {
            from: "sammygarma26@gmail.com",
            to: email,
            subject: "For verification",
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

app.post("/addProduct", function(req, res){
    const product = new Product({
        brand: req.body.productBrand,
        name: req.body.productName,
        price: req.body.productPrice,
        description: req.body.productDescription,
        quantity: req.body.productQuantity,
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