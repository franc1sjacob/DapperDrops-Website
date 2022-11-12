const express = require('express');
const router = express.Router();

const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Sale = require("../../models/salesModel");
const Order = require("../../models/orderModel");

const { parse } = require('json2csv');
const fs = require('fs');



router.get('/sales', async function(req, res){
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
        { $sort: { day: 1 }}
    ])

    console.log("RESULT", result);

    result.forEach(function(sale){
        data.push({
            date: sale._id.day + "/" + sale._id.month + "/" + sale._id.year,
            earnings: sale.earnings
        });
    });

    console.log("DATA", data);

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
    res.render('admin/charts/sales/sales', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/sales-sortByMonth', async function(req, res){
    let data = [];
    const result = await Sale.aggregate([
        { $group: {
            _id: {
                month: { $month : "$dateSold" },
                year: { $year : "$dateSold" },
            },
            earnings: { $sum : "$earnings" }
        }},
        { $sort: { month: 1 }}
    ])

    console.log("RESULT", result);

    result.forEach(function(sale){
        data.push({
            date: sale._id.month + "/" + sale._id.year,
            earnings: sale.earnings
        });
    });

    console.log("DATA", data);

    const fields = ['date', 'earnings'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/sales-sortByMonth.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/sales/sales-sortByMonth', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/sales-sortByYear', async function(req, res){
    let data = [];
    const result = await Sale.aggregate([
        { $group: {
            _id: {
                year: { $year : "$dateSold" },
            },
            earnings: { $sum : "$earnings" }
        }},
        { $sort: { year: 1 }}
    ])

    console.log("RESULT", result);

    result.forEach(function(sale){
        data.push({
            date: sale._id.year,
            earnings: sale.earnings
        });
    });

    console.log("DATA", data);

    const fields = ['date', 'earnings'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/sales-sortByYear.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/sales/sales-sortByYear', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/trylang', async function(req, res){
    let data = [];
    const result = await Sale.aggregate([
        { $group: {
            _id: {
                month: { $month : "$dateSold" },
                day: { $dayOfMonth : "$dateSold" },
                year: { $year : "$dateSold" },
                date: { $dayOfYear : "$dateSold" } 
            },
            earnings: { $sum : "$earnings" }
        }},
        { $sort: { date: 1 }}
    ])

    result.forEach(function(sale){
        data.push({
            date: sale._id.day + "/" + sale._id.month + "/" + sale._id.year,
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
    res.render('admin/reports2', { sales: earningsData, date: dateData, fullName: req.session.firstName + " " + req.session.lastName });
});

router.post('/export', async function(req, res){
    Sale.find({}, function(err, sale){

        const fields = ['orderId', 'earnings', 'dateSold', 'items'];
        const opts = { fields };

        try{
            const csv = parse(sale, opts);
            fs.writeFile('sales.csv', csv, function(error){
                if(error) throw error;
                console.log("write success!");
            });
            console.log(csv);
        } catch (err) {
            console.log(err);
        }
    })
})
 
module.exports = router;