const express = require('express');
const router = express.Router();

const { parse } = require('json2csv');
const fs = require('fs');

const Product = require("../../models/productModel");
const Sale = require("../../models/salesModel");
const Order = require("../../models/orderModel");
const User = require("../../models/userModel");

const isAuth = function(req, res, next){
    if(req.session.isAuth){
        next();
    } else {
        res.redirect('/account/login');
    }
}

const isAdmin = function(req, res, next){
    if(req.session.accountType === "admin"){
        req.session.isAdmin = true;
        next();
    } else {
        res.redirect('/');
    }
}

router.get("/", isAuth, isAdmin, async function(req, res){
    let earnings, pending, completed, onhand, preorder, accessories, apparel, customer, admin;

    //Getting total sum of sales earnings
    const totalEarnings = await Sale.aggregate([
        { $group: {
            _id: {
                earnings: { $gte: ["$earnings", 0] }
            },
            earnings: { $sum: "$earnings" }
        }}
    ]);

    if(totalEarnings.length == 0){
        earnings = 0;
    } else {
        earnings = totalEarnings[0].earnings;
    }

    const totalPendingOrders = await Order.aggregate([
        { $match: { orderStatus: "Pending" }},
        { $count: "total" }
    ]);

    if(totalPendingOrders.length == 0){
        pending = 0;
    } else {
        pending = totalPendingOrders[0].total;
    }

    const totalCompletedOrders = await Order.aggregate([
        { $match: { orderStatus: "Completed" }},
        { $count: "total" }
    ]);

    if(totalCompletedOrders.length == 0){
        completed = 0;
    } else {
        completed = totalCompletedOrders[0].total;
    }

    const totalOnhand = await Product.aggregate([
        { $match: { category: "On-Hand" }},
        { $count: "total" }
    ]);

    if(totalOnhand.length == 0){
        onhand = 0;
    } else {
        onhand = totalOnhand[0].total;
    }

    const totalPreOrder = await Product.aggregate([
        { $match: { category: "Pre-Order" }},
        { $count: "total" }
    ]);

    if(totalPreOrder.length == 0){
        preorder = 0;
    } else {
        preorder = totalPreOrder[0].total;
    }

    const totalAccessories = await Product.aggregate([
        { $match: { category: "Accessories" }},
        { $count: "total" }
    ]);

    if(totalAccessories.length == 0){
        accessories = 0;
    } else {
        accessories = totalAccessories[0].total;
    }

    const totalApparel = await Product.aggregate([
        { $match: { category: "Apparel" }},
        { $count: "total" }
    ]);

    if(totalApparel.length == 0){
        apparel = 0;
    } else {
        apparel = totalApparel[0].total;
    }

    const totalCustomerUsers = await User.aggregate([
        { $match: { isVerified: "true", accountType: "user" }},
        { $count: "total" }
    ]);

    if(totalCustomerUsers.length == 0){
        customer = 0;
    } else {
        customer = totalCustomerUsers[0].total;
    }

    const totalAdminUsers = await User.aggregate([
        { $match: { isVerified: "true", accountType: "admin" }},
        { $count: "total" }
    ]);

    if(totalAdminUsers.length == 0){
        admin = 0;
    } else {
        admin = totalAdminUsers[0].total;
    }

    const totals = {
        earnings: earnings,
        pending, pending,
        completed: completed,
        onhand: onhand,
        preorder: preorder,
        accessories: accessories,
        apparel: apparel,
        customer: customer,
        admin: admin
    }

    //Chart #1
    let data = [];
    const result = await Sale.aggregate([
        { $group: {
            _id: {
                month: { $month : "$dateSold" },
                day: { $dayOfMonth : "$dateSold" },
                year: { $year : "$dateSold" },
                date : { $toDate: { $dateToString:{ format: "%Y-%m-%d", date: "$dateSold"} } },
                dayOf : { $dayOfYear : "$dateSold" }
            },
            earnings: { $sum : "$earnings" }
        }},
        { $sort: { '_id.date': 1 }},
    ]);

    result.forEach(function(sale){
        data.push({
            date: sale._id.year + "-" + sale._id.month + "-" + sale._id.day,
            earnings: sale.earnings
        });
    });

    const fields = ['date', 'earnings'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/sales.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    //Chart #2
    let data2 = [];
    const result2 = await Product.aggregate([
        { $group: { 
            _id: {
                productId: "$_id",
                brand: "$brand",
                name: "$name",
                quantityRemaining: { $sum:"$variations.quantity" }
        }}}
    ]);

    result2.forEach(function(product){
        data2.push({
            productId: product._id.productId,
            brand: product._id.brand,
            name: product._id.name,
            quantityRemaining: product._id.quantityRemaining
        });
    })

    const fields2 = ['productId', 'brand', 'name', 'quantityRemaining'];
        const opts2 = { fields2 };

    try {
        const csv = parse(data2, opts2);
        fs.writeFile('./public/charts/inventory-stock-level.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/dashboard', {fullName: req.session.firstName + " " + req.session.lastName, total: totals});
});

module.exports = router;