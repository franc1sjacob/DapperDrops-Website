require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const mongoose = require('mongoose');

const app = express();
const port = 3000 || process.env.PORT;

//FOR IMAGE DISPLAY

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

const adminRoute = require("./routes/admin/Admin");
app.use("/admin", adminRoute);

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

app.listen(port, function(){
    console.log("Server started on port " + port);
});