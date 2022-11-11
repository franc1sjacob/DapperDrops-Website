const express = require('express');
const router = express.Router();

const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");

router.get('/', function(req, res){
    Order.find({ orderStatus: "Completed "}, )
    res.render('admin/reports', { fullName: req.session.firstName + " " + req.session.lastName });
});
 
module.exports = router;