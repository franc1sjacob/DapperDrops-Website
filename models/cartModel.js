module.exports = function Cart(oldCart) {
    this.items = oldCart.items || {};
    this.totalQty = oldCart.totalQty || 0;
    this.totalPrice = oldCart.totalPrice || 0;

    this.add = function(item, id, quantity, variation){
        var storedItem = this.items[id];
        console.log('selected variation: ', variation);

        if (!storedItem) {
            storedItem = this.items[id] = {item: item, variation: variation, qty: 0, price: 0};
        }

        storedItem.variation = variation;
        console.log('storedQuantity before adding new quantity: ', storedItem.qty);
        console.log('quantity input in view-cart page: ', quantity);
        storedItem.qty = parseInt(storedItem.qty) + parseInt(quantity);
        storedItem.price = storedItem.item.price * parseInt(storedItem.qty);
        this.totalQty += parseInt(quantity);
        this.totalPrice = storedItem.item.price * this.totalQty;
    };

    this.generateArray = function(){
        var arr = [];
        for (var id in this.items){
            arr.push(this.items[id]);
        }
        return arr;
    };
};