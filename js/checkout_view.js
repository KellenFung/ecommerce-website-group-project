$(document).ready(function(){
    //we can get this array through a request to the backend
    //using it just for prototype
    let products = {
        "refridgerator": {
            name: "Refridgerator",
            price: 500.00,
            quantity: 1
        },
        "microwave": {
            name: "Microwave",
            price: 300.00,
            quantity: 1
        },
        "dishwasher": {
            name: "Dishwasher",
            price: 450.00,
            quantity: 1
        }
    };
    
    let totalPrice = 0;
    for(let productID in products){
        $('#order-summary').append(`<div> ${products[productID].name} x${products[productID].quantity}: $${products[productID].price * products[productID].quantity} </div>`);
        totalPrice += products[productID].quantity * products[productID].price;
    }

    $('#order-calculations').html(
        `Total: $${totalPrice}`
    )
})