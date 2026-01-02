// js/cart.js

// 1. INITIALIZE CART FROM STORAGE (Crucial for multi-page)
let cart = JSON.parse(localStorage.getItem('bortehCart')) || [];

// Helper to save changes
function saveCart() {
    localStorage.setItem('bortehCart', JSON.stringify(cart));
    updateCartIcon(); // Optional visual update
}

// 2. Add Item to Cart
function addToCart(name, price) {
    // Check if item already exists
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: name, price: price, quantity: 1 });
    }

    // Save to memory
    saveCart();

    // Show feedback
    alert(`${name} added to cart!`);
}

// 3. Remove/Decrease Item
function changeQuantity(name, change) {
    const item = cart.find(i => i.name === name);
    if (!item) return;

    item.quantity += change;

    // If quantity is 0, remove it
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.name !== name);
    }

    saveCart();
    renderCart(); // Re-render the list immediately
}

// 4. Update the little red dot (Optional visuals)
function updateCartIcon() {
    // This logic can be expanded if you want a counter on the header icon
    // For now, it ensures the data is ready
}

// 5. Render the List (Runs on cart.html)
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total');
    
    // Safety Check: If we are on Home page, these elements don't exist, so stop.
    if (!container || !totalEl) return;
    
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-basket-shopping text-4xl text-gray-300 mb-3"></i><p class="text-gray-400">Your cart is empty.</p></div>';
        totalEl.innerText = 'Le 0';
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const html = `
        <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
                <div class="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                    <i class="fa-solid fa-gift"></i>
                </div>
                <div>
                    <h4 class="font-bold text-[#5D4037] text-sm">${item.name}</h4>
                    <p class="text-xs text-gray-500 font-bold">Le ${item.price}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                <button onclick="changeQuantity('${item.name}', -1)" class="w-8 h-8 bg-white border border-gray-200 rounded-md text-[#5D4037] flex items-center justify-center hover:bg-gray-100 transition">-</button>
                <span class="text-sm font-bold w-4 text-center">${item.quantity}</span>
                <button onclick="changeQuantity('${item.name}', 1)" class="w-8 h-8 bg-[#5D4037] text-white rounded-md flex items-center justify-center shadow-md hover:bg-[#4a322c] transition">+</button>
            </div>
        </div>
        `;
        container.innerHTML += html;
    });

    totalEl.innerText = 'Le ' + total.toLocaleString(); // Adds commas (e.g., 1,000)
}

// 6. THE KILLER FEATURE: Send to WhatsApp
function checkoutWhatsApp() {
    if (cart.length === 0) return alert("Cart is empty!");

    // Borteh's Number (Updated)
    const phoneNumber = "23279293915"; 

    let message = "Hello Borteh, I would like to order:\n\n";
    let total = 0;

    cart.forEach(item => {
        message += `- ${item.name} (x${item.quantity})\n`;
        total += item.price * item.quantity;
    });

    message += `\n*Total Estimate: Le ${total.toLocaleString()}*`;
    message += "\n\nPlease confirm availability.";

    // Encode the text so it works in a URL
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp
    window.open(url, '_blank');
}