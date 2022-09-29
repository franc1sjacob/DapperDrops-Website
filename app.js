require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();
const port = 3000 || process.env.PORT;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:true
}));
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
    }
});

const productSchema = new mongoose.Schema({
    brand: String,
    name: String,
    price: Number,
    description: String,
    quantity: Number
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
                        res.render('admin/dashboard');
                    }
                });
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
                res.render('admin/dashboard');
            }
        });
    });
});

app.get("/admin/products", function (req, res) {   
    Product.find({}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("admin/products", { newListProducts: allProducts })
        }
    });
});


app.get("/admin/product/add", function(req, res){
    res.render('admin/add-product');
});

app.post("/addProduct", function(req, res){
    const product = new Product({
        brand: req.body.productBrand,
        name: req.body.productName,
        price: req.body.productPrice,
        description: req.body.productDescription,
        quantity: req.body.productQuantity
    });

    product.save(function(err){
        if(err){
            console.log(err);
        }
        res.redirect("/admin/products");
    });
});

app.listen(port, function(){
    console.log("Server started on port " + port);
});