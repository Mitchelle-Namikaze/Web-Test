// js/cart.js

// 1. INITIALIZE CART FROM STORAGE
let cart = JSON.parse(localStorage.getItem('bortehCart')) || [];

// Helper to save changes
function saveCart() {
    localStorage.setItem('bortehCart', JSON.stringify(cart));
}

// 2. THEME LOGIC (SYNCED WITH APP.JS)
function loadTheme() {
    // CHANGED: Now uses 'theme' to match your app.js
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Ensure Tailwind dark class is also applied if needed
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    // Check current state from the attribute like app.js does
    const currentTheme = html.getAttribute('data-theme'); 
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Save to localStorage using the correct key: 'theme'
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Toggle the class for Tailwind
    if (newTheme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    updateThemeIcon(newTheme);
    
    // Re-render cart to apply new colors to items immediately
    renderCart(); 
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon-cart');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun text-yellow-400' : 'fa-solid fa-moon text-gray-600';
    }
}

// 3. Add Item to Cart
function addToCart(name, price, image) {
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: name, price: price, image: image, quantity: 1 });
    }

    saveCart();
    // CHANGED: Replaced alert with showToast
    showToast(`${name} added to cart!`);
}

// 4. Remove/Decrease Item
function changeQuantity(name, change) {
    const item = cart.find(i => i.name === name);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(i => i.name !== name);
    }

    saveCart();
    renderCart(); 
}

// 5. Render the List (Runs on cart.html)
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total');
    
    if (!container || !totalEl) return;
    
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <i class="fa-solid fa-basket-shopping text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-400">Your shopping bag is empty.</p>
            </div>`;
        totalEl.innerText = 'Le 0';
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const html = `
        <div class="flex justify-between items-center bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] animate-fade-in">
            <div class="flex items-center gap-4">
                <div class="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img src="${item.image}" class="w-full h-full object-cover" alt="${item.name}">
                </div>
                <div>
                    <h4 class="font-bold text-[var(--text-primary)] text-sm">${item.name}</h4>
                    <p class="text-xs text-gray-500 font-bold">Le ${item.price.toLocaleString()}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                <button onclick="changeQuantity('${item.name.replace(/'/g, "\\'")}', -1)" 
                    class="w-8 h-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition">-</button>
                <span class="text-sm font-bold w-4 text-center text-[var(--text-primary)]">${item.quantity}</span>
                <button onclick="changeQuantity('${item.name.replace(/'/g, "\\'")}', 1)" 
                    class="w-8 h-8 bg-primary text-white rounded-md flex items-center justify-center shadow-md hover:opacity-90 transition">+</button>
            </div>
        </div>
        `;
        container.innerHTML += html;
    });

    totalEl.innerText = 'Le ' + total.toLocaleString(); 
}

// 6. CHECKOUT
function checkoutWhatsApp() {
    // CHANGED: Replaced alert with showToast
    if (cart.length === 0) return showToast("Cart is empty!");

    const phoneNumber = "23279293915"; 
    let total = 0;
    let itemsList = "";

    cart.forEach(item => {
        total += item.price * item.quantity;
        itemsList += `• *${item.name}* (Qty: ${item.quantity})%0A`;
        itemsList += `🔗 Photo: ${item.image}%0A%0A`;
    });

    let message = `*NEW ORDER - BORTEH'S LUXURY*%0A%0A`;
    message += `Hello Borteh, I was shopping on your website and I’d like to place an order.%0A%0A`;
    message += `${itemsList}`;
    message += `*TOTAL ESTIMATED COST: Le ${total.toLocaleString()}*%0A%0A`;
    message += `Please confirm availability. Thank you!`;

    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');

    cart = []; 
    saveCart(); 
    renderCart(); 
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    renderCart();
});

// --- CUSTOM NOTIFICATION FUNCTION ---
// Replaces the browser alert with a professional toast popup
function showToast(message) {
    // 1. Create the element if it doesn't exist
    let toast = document.getElementById('toast-box');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-box';
        document.body.appendChild(toast);
    }

    // 2. Set text and show
    toast.innerText = message;
    toast.className = 'show';

    // 3. Hide after 3 seconds
    setTimeout(() => { 
        toast.className = toast.className.replace('show', ''); 
    }, 3000);
}