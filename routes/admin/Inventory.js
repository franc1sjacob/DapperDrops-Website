const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

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

const Product = require("../../models/productModel");


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
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.jfif') {
            return callback(new Error('Only images are allowed'))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
}).single('productImage');



router.get("/", isAuth, isAdmin, async function (req, res) {   
    // Product.find({}, function (err, allInventory) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         res.render('admin/inventory', { newListInventory: allInventory })
    //     }
    // });
      //     $lookup: {
    //         from: "inventories", // collection to join
    //         localField: "_id",//field from the input documents
    //         foreignField: "_id",//field from the documents of the "from" collection
    //         as: "productDetails"// output array field
    //     }
    // }, 
    // {
    //     $unwind:'$productDetails'
    // },
    // {
    //     $addFields:{
    //         sales:'$productDetails.sales', sold:'$productDetails.sold',status:'$productDetails.status'
    //     }
    //     },
    //unwide and addfields removes array and adds it to the products collection.
    let { stype, sdir, ftype, fvalue } = req.query;
    if(!stype && !sdir && !ftype && !fvalue){
        products = await Product.aggregate([{
            $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            }
        }]);
    } else if (!stype && !sdir) {
        products = await Product.aggregate([
            { $match: {
                [ftype]: fvalue
            } },
            { $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate": {
                    $multiply: [ { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] }, 100 ]
                }
            } }
        ]);

        // products = await Product.find({ [ftype] : fvalue });
    } else if (!ftype && !fvalue) {
        console.log("ETOOOO 3")
        products = await Product.aggregate([
            { $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } },
            { $sort: {
                [stype] : parseInt(sdir)
            } }
        ]);

        console.log(products);
        // products = await Product.find({}).sort({ [stype] : sdir });
    } else {
        console.log("ETOOOO 4")
        products = await Product.aggregate([
            { $match: {
                [ftype]: fvalue
            } },
            { $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } },
            { $sort: {
                [stype] : parseInt(sdir)
            } }
        ]);
    }
    
    const brands = await Product.aggregate([
        { $group: {
            _id: {
                brand: "$brand"
            }
        } }
    ]).sort({ "_id.brand": 1 });
    
    res.render('admin/inventory', {
        newListInventory: products,
        brands: brands,
        stype: stype,
        sdir: sdir,
        ftype: ftype,
        fvalue: fvalue,
        fullName: req.session.firstName + " " + req.session.lastName})

});

router.get('/search-inventory', async function(req, res){
    let { stype, sdir } = req.query;
    let query = req.query.query;
    let searchedProducts, brands;

    if(!query) {
        query = "";
    }

    if(!stype || !sdir){
        searchedProducts = await Product.aggregate([
            { $match: 
                { $or: [
                    { name: { $regex: query, $options: 'i'} },
                    { brand: { $regex: query, $options: 'i'} },
                ] }
            },
            { $project: {
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } }
        ]);
    } else {
        searchedProducts = await Product.aggregate([
            { $match: 
                { $or: [
                    { name: { $regex: query, $options: 'i'} },
                    { brand: { $regex: query, $options: 'i'} },
                ] }
            },
            { $project: {
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate": {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } },
            { $sort: {
                [stype] : parseInt(sdir)
            }}
        ]);
    }
    

    console.log(searchedProducts)

    res.render('admin/search-inventory', {
        newListInventory: searchedProducts,
        stype: stype,
        sdir: sdir,
        query: query,
        fullName: req.session.firstName + " " + req.session.lastName})
});

router.get("/:productId/inventoryview", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, allProducts){
        res.render('admin/view-inventoryProducts', { newListProducts:allProducts,
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
});

router.get("/:productId/delete", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    Product.findByIdAndRemove({ _id:productId }, function(err, result){
        if(result.image != ''){
            try{
                fs.unlinkSync('public/uploads/' + result.image)
            }catch(err){
                console.log(err)
            }
        }
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/inventory')
        }
    
    });
});

router.get("/update-variation/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);

    Product.findById({_id: productId}, function(err, product){
        if(err){
            console.log(err);
        }
        else{
            const variation = product.variations.find(obj => obj.id === variationId);
            console.log(variation);
            
            res.render('admin/update-variation-inventory', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.get("/:productId/add-new-variation-inventory", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/add-new-variation-inventory', {
            fullName: req.session.firstName + " " + req.session.lastName,
             product:product
        });
    })
});

router.post("/:productId/add-new-variation-inventory", isAuth, isAdmin, function(req, res){
    const {productId, name, quantity} = req.body;
    let status="";
    console.log(req.body);
    if(quantity >= 6){
        status = "In-Stock";
   }
   else if(quantity <= 5 && quantity >=1){
        status = "Few-Stocks";
   }
   else if(quantity == 0){
        status = "Out-of-Stock";
   }
   const variation = {
    name: name,
    quantity: quantity,
    status: status
};
   console.log(variation);
    Product.findByIdAndUpdate({"_id" : productId }, { $push: { 
        variations: [variation],
    }}, function(err, product){
            if(err){
                console.log(err);
            } else {           
               res.redirect("/admin/inventory/"+productId+"/inventoryview")
            }
        });
   
   
});

router.post("/update-variation/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    const { variationName } = req.body;

    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $set:{
            'variations.$.name': variationName,
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
        }
    });
});
router.get("/add-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);
    

    Product.findById({_id: productId}, function(err, product){
        if(err){
            console.log(err);
        }
        else{
            const variation = product.variations.find(obj => obj.id === variationId);
            console.log(variation);
            
            res.render('admin/add-quantity-variation-inventory', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/add-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    const { variationQuantity, origVariationQuantity } = req.body;
    console.log(variationId);
    let status="";
    
    if(variationQuantity + origVariationQuantity >= 6){
        status = "In-Stock";
    }
    else if(variationQuantity + origVariationQuantity <= 5 && variationQuantity + origVariationQuantity >=1){
        status = "Few-Stocks";
    }
    else if(variationQuantity + origVariationQuantity == 0){
        status = "Out-of-Stock";
    }

    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $inc: {
            // 'variations.$.name': variationName,
            'variations.$.quantity': variationQuantity,
            'variations.$.stockAcquired': variationQuantity,
            // 'variations.$.status': status
        },
        $set: {
            'variations.$.status': status
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
        }
    });
});
//NEWWWWWWWWWWWWWWWWWWWWWWWWWW

//NEWWWWWWWWWWWWWWWWWWWWW MINUS
router.get("/minus-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);
    

    Product.findById({_id: productId}, function(err, product){
        if(err){
            console.log(err);
        }
        else{
            const variation = product.variations.find(obj => obj.id === variationId);
            console.log(variation);
            
            res.render('admin/minus-quantity-variation-inventory', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/minus-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    const { variationQuantity, origVariationQuantity } = req.body;
    console.log(variationId);
    let status="";
    
    if(origVariationQuantity - variationQuantity >= 6){
        status = "In-Stock";
    }
    else if(origVariationQuantity - variationQuantity <= 5 && origVariationQuantity - variationQuantity >=1){
        status = "Few-Stocks";
    }
    else if(origVariationQuantity - variationQuantity == 0){
        status = "Out-of-Stock";
    }

    console.log(status)

    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $inc: {
            // 'variations.$.name': variationName,
            'variations.$.quantity': -variationQuantity,
            'variations.$.stockAcquired': -variationQuantity,
            // 'variations.$.status': status
        },
        $set: {
            'variations.$.status': status
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
        }
    });
});
//NEWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW

router.get("/delete-variation/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);
    let status="";
    const {variationName, variationQuantity} = req.body;

    const conditions = {
        _id: productId,
        // 'variations._id': {$eq: variationId}
    };

    const remove = {
        $pull: { 
            variations: {
                _id: { $in: variationId}
            } 
            
          }
    }

	Product.updateOne(conditions, remove, function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
        }
    });
});
module.exports = router;