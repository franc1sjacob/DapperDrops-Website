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



//FOR IMAGE DISPLAY
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

//EXPORT MODELS
const User = require("./models/userModel");
const Product = require("./models/productModel");

//EXPORT ROUTES
const productRoute = require("./routes/Products");
app.use("/products", productRoute);

const accountRoute = require("./routes/Account");
app.use("/account", accountRoute);

//MongoDB
main().catch(err => console.log(err));

async function main(){
    await mongoose.connect('mongodb://localhost:27017/dapperdropsDB');
    console.log("Connected to db!");
}

//ROUTES
//INDEX
app.get("/", function(req, res){
    res.render('index');
});

app.get("/about", function(req, res){
    res.render('about');
});

//LOGIN/REGISTER/FORGOT PASSWORD


//EMAIL FUNCTIONALITIES


//ADMIN DASHBOARD
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

app.get("/admin/products/:productId/edit", function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/update-product', {
            _id: productId,
            brand: product.brand,
            name: product.name,
            price: product.price,
            description: product.description,
            quantity: product.quantity,
            image: product.image,
            type: product.type,
        });
    })
});

app.post("/admin/products/:productId", upload, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    Product.updateOne(
        {_id: productId},
        {$set:{
            brand: req.body.productBrand,
            name: req.body.productName,
            price: req.body.productPrice,
            description: req.body.productDescription,
            quantity: req.body.productQuantity,
            image: req.file.filename,
            type: req.body.productType
        }}, function(err, results){
            if(!err){
                res.redirect("/admin/products");
            } else {
                console.log(err);
            }
        }
    ); 
    
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

app.post("/delete-product", function(req, res){
    const productId = req.body.deleteId;
    Product.findByIdAndRemove({ _id:productId }, function(err, user){
        if(err){
            console.log(err);
        } else {
            console.log("Deleted!" + productId);
            res.redirect("/admin/products");
        }
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