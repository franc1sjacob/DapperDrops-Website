require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);



const app = express();
let port = process.env.PORT;
if(port == null || port == ""){
    port = 3000;
}


//EXPORT MODELS
const User = require("./models/userModel");
const Product = require("./models/productModel");
const Cart = require("./models/cartModel");
const Wishlist = require("./models/wishlistModel");
const Order = require("./models/orderModel");
const Content = require("./models/contentModel");
const Featured = require("./models/featuredModel");

//MongoDB
//const mongoUri = "mongodb+srv://admin-dapperdrops:admin123@cluster0.i5opsug.mongodb.net/dapperdropsDB";
 const mongoUri = "mongodb://localhost:27017/dapperdropsDB";
// const mongoUri = "mongodb://admin-dapperdrops:admin123@ac-urowtdl-shard-00-00.i5opsug.mongodb.net:27017,ac-urowtdl-shard-00-01.i5opsug.mongodb.net:27017,ac-urowtdl-shard-00-02.i5opsug.mongodb.net:27017/dapperdropsDB?ssl=true&replicaSet=atlas-6r1cqm-shard-0&authSource=admin&retryWrites=true&w=majority";

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

app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

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

const adminOrderRoute = require("./routes/admin/Order");
app.use("/admin/orders/", adminOrderRoute);

const adminInventoryRoute = require("./routes/admin/Inventory");
app.use("/admin/inventory/", adminInventoryRoute);

const adminReportRoute = require("./routes/admin/Reports");
app.use("/admin/reports/", adminReportRoute);

const adminFeedbackRoute = require("./routes/admin/Feedback");
app.use("/admin/feedback/", adminFeedbackRoute);

const adminContentRoute = require("./routes/admin/Content");
app.use("/admin/content/", adminContentRoute);

const adminLogRoute = require("./routes/admin/Log");
app.use("/admin/logs/", adminLogRoute);

//INDEX
app.get("/", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const featuredArr = [];
    let nullProduct = [];
    const userId = req.session.userId;

    const content = await Content.findOne({ status: 'active' });
    const newArrivals = await Product.aggregate([]).sort({ dateCreated: -1}).limit(8);
    const featured = await Featured.find({}).sort({ dateAdded: -1 }).limit(8);

    for(let i = 0; i < featured.length; i++){
        foundProduct = await Product.findById(featured[i].productId);
        if(foundProduct == null) {
            nullProduct = {
                _id: featured[i].productId, 
                brand: "Unavailable",
                name: "Product Removed",
                price: 0,
                image: {
                    url: "/images/icons/productRemovedImg.jpg"
                }
            }
            featuredArr.push(nullProduct);
        } else {
            featuredArr.push(foundProduct);
        }
        
    }

    res.render('index', { newArrivals: newArrivals, content: content, featured: featuredArr, userId: userId, isAdmin: isAdmin });
});

app.get("/about", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('about', { content: content, isAdmin: isAdmin });
});

app.get("/faqs", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('faqs', { content: content, isAdmin: isAdmin });
});

app.get("/tos", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('tos', { content: content, isAdmin: isAdmin });
});

app.get("/bulk", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active'});
    res.render('bulk', { content: content, isAdmin: isAdmin });
});

app.get("*", async function(req, res){
    const isAdmin = req.session.isAdmin;
    const content = await Content.findOne({ status: 'active' });
    res.render('error/404', { content: content, isAdmin: isAdmin });
});

app.listen(port, function(){
    console.log("Server started on port " + port);
});