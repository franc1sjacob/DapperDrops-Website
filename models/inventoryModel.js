const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
   productId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
   },
   sales: Number,
   sold: Number,
   status: String
});

module.exports = mongoose.model("Inventory", inventorySchema);