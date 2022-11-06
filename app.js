require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);


const app = express();
const port = 3000 || process.env.PORT;


//EXPORT MODELS
const User = require("./models/userModel");
const Product = require("./models/productModel");
const Cart = require("./models/cartModel");
const Wishlist = require("./models/wishlistModel");
const Order = require("./models/orderModel");


//MongoDB
const mongoUri = "mongodb://localhost:27017/dapperdropsDB";

main().catch(err => console.log(err));

async function main(){
    await mongoose.connect(mongoUri).then(function(res){
        console.log("Connected to MongoDB.")
    });
}

const store = new MongoDBSession({
    uri: mongoUri,
    collection: 'dd-sessions'
});

//FOR IMAGE DISPLAY

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:false
}));
app.use(bodyParser.json());
app.use(express.static("public"));

//Session
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: store
}));

//EXPORT ROUTES
const productRoute = require("./routes/Products");
app.use("/products", productRoute);

const accountRoute = require("./routes/Account");
app.use("/account", accountRoute);

const cartRoute = require("./routes/Cart");
app.use("/cart", cartRoute);

//ADMIN

const adminDashbordRoute = require("./routes/admin/Dashboard");
app.use("/admin/dashboard/", adminDashbordRoute);

const adminProductRoute = require("./routes/admin/Products");
app.use("/admin/products/", adminProductRoute);

const adminAccountRoute = require("./routes/admin/Account");
app.use("/admin/accounts/", adminAccountRoute);

//INDEX
app.get("/", function(req, res){
    Product.find({}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('index', { newProducts: allProducts });
        }
    });
});

app.get("/about", function(req, res){
    res.render('about');
});

app.listen(port, function(){
    console.log("Server started on port " + port);
});