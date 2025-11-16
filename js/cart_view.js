$(document).ready(function(){
    //This is a placeholder associative array
    //it should be returned by the backend when we get our database working
    let products = {
        "apple": {
            name: "Apple",
            price: 2.00,
            quantity: 0
        },
        "banana": {
            name: "Banana",
            price: 1.00,
            quantity: 0
        },
        "smoothie": {
            name: "Smoothie",
            price: 10.00,
            quantity: 0
        }
    }

    $('.add-counter').on('click', function(){
        console.log("clicked");
        const productDiv = $(this).closest('.product');
        const productID = productDiv.data('product-id');
        const input = productDiv.find('.quantity-input');

        let currentQty = parseInt(input.val()) || 1;
        currentQty++;

        input.val(currentQty);
        products[productID].quantity = currentQty;
        updateLineTotal(productDiv, productID);
        updateCartTotal();
    })

    $('.subtract-counter').on('click', function(){
        const productDiv = $(this).closest('.product');
        const productID = productDiv.data('product-id');
        const input = productDiv.find('.quantity-input');

        let currentQty = parseInt(input.val()) || 1;
        if (currentQty > 0){
            currentQty--;
        }

        input.val(currentQty);
        products[productID].quantity = currentQty;
        updateLineTotal(productDiv, productID);
        updateCartTotal();
    })

    function updateLineTotal(productDiv, productID){
        const qty = products[productID].quantity;
        const price = products[productID].price;
        const total = qty * price;
    }

    function updateCartTotal(){
        let cartTotal = 0;
        for (let productID in products){
            cartTotal += (products[productID].quantity * products[productID].price);
        }
        $('.order-summary-total').html(`<p>Total: $${cartTotal.toFixed(2)}`);
    }
})