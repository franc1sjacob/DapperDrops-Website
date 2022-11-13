const express = require('express');
const router = express.Router();

const Product = require("../../models/productModel");
const Cart = require("../../models/cartModel");
const Sale = require("../../models/salesModel");
const Order = require("../../models/orderModel");

const { parse } = require('json2csv');
const fs = require('fs');

router.get('/', async function(req, res){
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
    ])

    console.log("RESULT", result);

    result.forEach(function(sale){
        data.push({
            date: sale._id.year + "-" + sale._id.month + "-" + sale._id.day,
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
                date: { $dateToString: {
                    "date": "$dateSold",
                    "format": "%Y-%m"
                }}
            },
            earnings: { $sum : "$earnings" }
        }},
        { $sort: { '_id.date': 1 }}
    ])

    console.log("RESULT", result);

    result.forEach(function(sale){
        data.push({
            date: sale._id.date,
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
        { $sort: { '_id.year': 1 }}
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

router.get('/inventory-performance-earnings', async function(req, res){
    let data = [];
    const result = await Product.find({}).sort('totalEarnings');

    console.log(result);

    result.forEach(function(product){
        data.push({
            productId: product._id,
            brand: product.brand,
            name: product.name,
            price: product.price,
            category: product.category,
            totalEarnings: product.totalEarnings,
            totalQuantitySold: product.totalQuantitySold
        });
    });

    const fields = ['productId', 'brand', 'name', 'price', 'category', 'totalEarnings', 'totalQuantitySold'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/products-performance-earnings.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/products/inventory-performance-earnings', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/inventory-performance-earnings-sortByBrand', async function(req, res){
    let data = [];

    const result = await Product.aggregate([
        { $group: {
            _id: { brand: "$brand" },
            earnings: { $sum: "$totalEarnings" }
        }}, { $sort: { earnings: 1 }}
    ]);

    result.forEach(function(product){
        data.push({
            brand: product._id.brand,
            earnings: product.earnings
        });
    })

    console.log(data);

    const fields = ['brand', 'earnings'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/brands-performance-earnings.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/products/inventory-performance-earnings-sortByBrand', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/inventory-performance-quantity', async function(req, res){
    let data = [];

    const result = await Product.aggregate([
        { $group: {
            _id: { _id: "$_id", name: "$name", brand: "$brand" },
            totalQuantitySold: { $sum: "$totalQuantitySold" }
        }}, { $sort: { totalQuantitySold: 1 }}
    ]);

    console.log(result);

    result.forEach(function(product){
        data.push({
            name: product._id.brand + " - " + product._id.name,
            totalQuantitySold: product.totalQuantitySold
        });
    })

    const fields = ['name', 'totalQuantitySold'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/products-performance-quantity.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    console.log(data);
    res.render('admin/charts/products/inventory-performance-quantity', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/inventory-performance-quantity-sortByBrand', async function(req, res){
    let data = [];

    const result = await Product.aggregate([
        { $group: {
            _id: { brand: "$brand" },
            totalQuantitySold: { $sum: "$totalQuantitySold" }
        }}, { $sort: { totalQuantitySold: 1 }}
    ]);

    console.log(result);

    result.forEach(function(product){
        data.push({
            brand: product._id.brand,
            totalQuantitySold: product.totalQuantitySold
        });
    })

    const fields = ['brand', 'totalQuantitySold'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/brands-performance-quantity.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    console.log(data);
    res.render('admin/charts/products/inventory-performance-quantity-sortByBrand', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/inventory-stock-level', async function(req ,res){
    let data = [];
    const result = await Product.aggregate([
        { $group: { 
            _id: {
                productId: "$_id",
                brand: "$brand",
                name: "$name",
                quantityRemaining: { $sum:"$variations.quantity" }
        }}}
    ]);

    result.forEach(function(product){
        data.push({
            productId: product._id.productId,
            brand: product._id.brand,
            name: product._id.name,
            quantityRemaining: product._id.quantityRemaining
        });
    })

    const fields = ['productId', 'brand', 'name', 'quantityRemaining'];
        const opts = { fields };

    try{
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/inventory-stock-level.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    console.log(result);

    res.render('admin/charts/products/inventory-stock-level', { fullName: req.session.firstName + " " + req.session.lastName });
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