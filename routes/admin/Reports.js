const express = require('express');
const router = express.Router();

const Product = require("../../models/productModel");
const Sale = require("../../models/salesModel");
const Order = require("../../models/orderModel");

const { parse } = require('json2csv');
const fs = require('fs');

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

router.get('/', isAuth, isAdmin, async function(req, res){
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
    res.render('admin/charts/sales/sales', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.post('/sales-Date-Filtered', isAuth, isAdmin, async function(req, res){
    const { dateStart, dateEnd } = req.body;
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
    res.render('admin/charts/sales/salesFiltered', { fullName: req.session.firstName + " " + req.session.lastName, dateStart: dateStart, dateEnd: dateEnd });
    
});

router.get('/sales-sortByMonth', isAuth, isAdmin, async function(req, res){
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
    ]);

    result.forEach(function(sale){
        data.push({
            date: sale._id.date,
            earnings: sale.earnings
        });
    });

    const fields = ['date', 'earnings'];
        const opts = { fields };

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/sales-sortByMonth.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/sales/sales-sortByMonth', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/sales-sortByYear', isAuth, isAdmin, async function(req, res){
    let data = [];
    const result = await Sale.aggregate([
        { $group: {
            _id: {
                year: { $year : "$dateSold" },
            },
            earnings: { $sum : "$earnings" }
        }},
        { $sort: { '_id.year': 1 }}
    ]);

    result.forEach(function(sale){
        data.push({
            date: sale._id.year,
            earnings: sale.earnings
        });
    });

    const fields = ['date', 'earnings'];
        const opts = { fields };

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/sales-sortByYear.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/sales/sales-sortByYear', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/inventory-performance-earnings', isAuth, isAdmin, async function(req, res){
    let data = [];
    const result = await Product.find({}).sort('totalEarnings');

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

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/products-performance-earnings.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/products/inventory-performance-earnings', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/inventory-performance-earnings-sortByBrand', isAuth, isAdmin, async function(req, res){
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
    });

    const fields = ['brand', 'earnings'];
        const opts = { fields };

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/brands-performance-earnings.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }
    res.render('admin/charts/products/inventory-performance-earnings-sortByBrand', { fullName: req.session.firstName + " " + req.session.lastName });
    
});

router.get('/inventory-performance-quantity', isAuth, isAdmin, async function(req, res){
    let data = [];

    const result = await Product.aggregate([
        { $group: {
            _id: { _id: "$_id", name: "$name", brand: "$brand" },
            totalQuantitySold: { $sum: "$totalQuantitySold" }
        }}, { $sort: { totalQuantitySold: 1 }}
    ]);

    result.forEach(function(product){
        data.push({
            name: product._id.brand + " - " + product._id.name,
            totalQuantitySold: product.totalQuantitySold
        });
    })

    const fields = ['name', 'totalQuantitySold'];
        const opts = { fields };

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/products-performance-quantity.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    res.render('admin/charts/products/inventory-performance-quantity', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/inventory-performance-quantity-sortByBrand', isAuth, isAdmin, async function(req, res){
    let data = [];

    const result = await Product.aggregate([
        { $group: {
            _id: { brand: "$brand" },
            totalQuantitySold: { $sum: "$totalQuantitySold" }
        }}, { $sort: { totalQuantitySold: 1 }}
    ]);

    result.forEach(function(product){
        data.push({
            brand: product._id.brand,
            totalQuantitySold: product.totalQuantitySold
        });
    });

    const fields = ['brand', 'totalQuantitySold'];
        const opts = { fields };

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/brands-performance-quantity.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    res.render('admin/charts/products/inventory-performance-quantity-sortByBrand', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/inventory-stock-level', isAuth, isAdmin, async function(req ,res){
    let data = [];
    const result = await Product.aggregate([
        { $match: { category: { $ne: 'Pre-Order' } } },
        { $group: { 
            _id: {
                productId: "$_id",
                brand: "$brand",
                name: "$name",
                quantityRemaining: { $sum:"$variations.quantity" }
            }
        }},
        { $sort: { '_id.quantityRemaining': 1 } }
    ]);

    console.log(result);

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

    try {
        const csv = parse(data, opts);
        fs.writeFile('./public/charts/inventory-stock-level.csv', csv, function(error){
            if(error) throw error;
        });
    } catch (err) {
        console.log(err);
    }

    res.render('admin/charts/products/inventory-stock-level', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.post('/export-:csvFile', isAuth, isAdmin, function(req, res){
    let csv;

    //Sales
    if(req.params.csvFile == "salesPerDate"){
        csv = './public/charts/sales.csv';
    } else if (req.params.csvFile == "salesPerMonth") {
        csv = './public/charts/sales-sortByMonth.csv';
    } else if (req.params.csvFile == "salesPerYear") {
        csv = './public/charts/sales-sortByYear.csv';
    //Inventory Performance
    //Earnings
    } else if (req.params.csvFile == "products-performance-earnings") {
        csv = './public/charts/products-performance-earnings.csv';
    } else if (req.params.csvFile == "brands-performance-earnings") {
        csv = './public/charts/brands-performance-earnings.csv';
    //Quantity Sold
    } else if (req.params.csvFile == "products-performance-quantity") {
        csv = './public/charts/products-performance-quantity.csv';
    } else if (req.params.csvFile == "brands-performance-quantity") {
        csv = './public/charts/brands-performance-quantity.csv';
    //Inventory Stock Level
    } else if (req.params.csvFile == "inventory-stock-level") {
        csv = './public/charts/inventory-stock-level.csv';
    } else {
        csv = './public/charts/nofile.csv';
    }

    fs.readFile(csv, function(err, content){
        if(err){
            res.writeHead(404, { "Content-type": "text/html" });
            res.end("<h1>No such .csv file!</h1>");
        } else {
            res.writeHead(200, { "Content-type" : "text/csv" });
            res.end(content);
        }
    });
});
 
module.exports = router;