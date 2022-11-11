const express = require('express');
const router = express.Router();

const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Sale = require("../../models/salesModel");



router.get('/', function(req, res){
    const earningsData = [];
    const dateData = [];
    Sale.find({}, function(err, sales){
        if(err){
            console.log(err);
        } else {
            sales.forEach(function(sale){
                earningsData.push(sale.earnings);
                dateData.push(sale.dateSold.toLocaleDateString("en-US"));
            })
            res.render('admin/reports', { sales: earningsData, date: dateData, fullName: req.session.firstName + " " + req.session.lastName });
        }
    })
    
});
 
module.exports = router;