// js/app.js

let allProductsCache = [];
let allCategoriesCache = []; // Cache for categories
let favorites = JSON.parse(localStorage.getItem('bortehFavorites')) || [];
let deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
    fetchCategories(); // 1. Fetch Categories First
    fetchProducts();   // 2. Then Fetch Products
    loadTheme();
    initInstallButtons();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
    
    // Wishlist check
    if (document.getElementById('favorites-list')) {
        setTimeout(renderFavorites, 500); 
    }
});

// --- FETCH DATA ---

async function fetchCategories() {
    const { data, error } = await window.supabaseClient
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) return console.error('Error categories:', error);
    
    allCategoriesCache = data;
    renderCategoryCircles(data);
}

async function fetchProducts() {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: false });

    // REPLACED ALERT WITH TOAST
    if (error) return showToast('Error loading products');

    allProductsCache = data;

    // Render Home Sections
    const newArrivals = document.getElementById('new-arrivals-container');
    if (newArrivals) renderHorizontalList(data.filter(p => p.is_new_arrival), newArrivals);

    const mainGrid = document.getElementById('all-products-grid');
    if (mainGrid) renderGrid(data, mainGrid);
    
    if (document.getElementById('favorites-list')) renderFavorites();
}

// --- RENDER FUNCTIONS ---

// UPDATED: min-width increased to 95px to match the larger 85px CSS circles
function renderCategoryCircles(categories) {
    const container = document.getElementById('categories-bar');
    if (!container) return;
    
    container.innerHTML = '';

    categories.forEach(cat => {
        container.innerHTML += `
        <div onclick="openCategory('${cat.name}')" class="flex flex-col items-center min-w-[95px] cursor-pointer group">
            <div class="cat-circle">
                <img src="${cat.image_url}" alt="${cat.name}">
            </div>
            <span class="text-xs font-bold text-primary mt-2">${cat.name}</span>
        </div>`;
    });

    container.innerHTML += `
        <div onclick="openAllCollections()" class="flex flex-col items-center min-w-[95px] cursor-pointer group">
            <div class="cat-circle bg-[#C6A87C] border-none">
                <i class="fa-solid fa-arrow-right text-2xl text-white"></i>
            </div>
            <span class="text-xs font-bold text-primary mt-2">View All</span>
        </div>
    `;
}

// Main Product Grid (Explore Everything)
function renderGrid(products, container) {
    if (!container) return;
    container.innerHTML = products.length === 0 ? '<p class="col-span-full text-center text-gray-400">No items available.</p>' : '';
    
    products.forEach(p => {
        const isFav = favorites.includes(p.id);
        const isOutOfStock = !p.stock || p.stock <= 0;

        container.innerHTML += `
        <div class="product-card p-3 relative flex flex-col h-full cursor-pointer transition" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
            <button onclick="event.stopPropagation(); toggleHeart(${p.id})" class="absolute top-2 right-2 z-10 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                <i class="${isFav ? 'fa-solid text-red-500' : 'fa-regular text-gray-400'} fa-heart"></i>
            </button>
            
            <div class="h-36 bg-gray-100 rounded-xl mb-2 overflow-hidden shrink-0 relative">
                <img src="${p.image_url}" class="w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-50' : ''}">
                ${isOutOfStock ? '<div class="absolute inset-0 flex items-center justify-center"><span class="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">SOLD OUT</span></div>' : ''}
            </div>
            <h4 class="font-bold text-primary text-sm truncate serif-font mb-1">${p.name}</h4>
            <p class="text-[10px] text-gray-500 mb-3 line-clamp-2">${p.description || 'No description available.'}</p>
            
            <div class="mt-auto">
                <div class="flex justify-between items-center mb-2">
                    <p class="text-accent font-bold text-xs">Le ${p.price}</p>
                    <p class="text-[9px] font-bold ${isOutOfStock ? 'text-red-500' : 'text-gray-400 uppercase tracking-tighter'}">
                        ${isOutOfStock ? 'Out of Stock' : p.stock + ' Left'}
                    </p>
                </div>
                <button 
                    onclick="event.stopPropagation(); ${isOutOfStock ? '' : `addToCart('${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image_url}')`}" 
                    class="w-full py-2 rounded-lg text-xs font-bold transition ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-none' : 'border border-[var(--text-primary)] text-primary hover:bg-primary hover:text-white'}"
                    ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                </button>
            </div>
        </div>`;
    });
}

// Horizontal List (Fresh Drops)
function renderHorizontalList(products, container) {
    if (!container) return;
    container.innerHTML = products.length === 0 ? '<p class="text-xs text-gray-400">No new drops.</p>' : '';
    
    products.forEach(p => {
        const isFav = favorites.includes(p.id);
        const isOutOfStock = !p.stock || p.stock <= 0;

        let displayDesc = 'No description available.';
        if (p.description) {
            const words = p.description.split(' ');
            displayDesc = words.length > 30 ? words.slice(0, 30).join(' ') + '...' : p.description;
        }

        container.innerHTML += `
        <div class="min-w-[180px] product-card p-3 flex-shrink-0 flex flex-col h-full relative cursor-pointer" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
            <button onclick="event.stopPropagation(); toggleHeart(${p.id})" class="absolute top-2 right-2 z-10 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                <i class="${isFav ? 'fa-solid text-red-500' : 'fa-regular text-gray-400'} fa-heart text-[10px]"></i>
            </button>

            <div class="h-32 bg-gray-100 rounded-xl mb-2 overflow-hidden shrink-0 relative">
                <img src="${p.image_url}" class="w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-50' : ''}">
                ${isOutOfStock ? '<div class="absolute inset-0 flex items-center justify-center"><span class="bg-red-600 text-white text-[8px] font-bold px-2 py-1 rounded">SOLD OUT</span></div>' : ''}
            </div>
            <h4 class="font-bold text-primary text-sm truncate serif-font mb-1">${p.name}</h4>
            <p class="text-[10px] text-gray-500 mb-2">${displayDesc}</p>
            
            <div class="mt-auto">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-accent font-bold text-xs">Le ${p.price}</span>
                    <span class="text-[8px] font-bold ${isOutOfStock ? 'text-red-500' : 'text-gray-400 uppercase'}">
                        ${isOutOfStock ? 'Sold Out' : p.stock + ' left'}
                    </span>
                </div>
                
                <button 
                    onclick="event.stopPropagation(); ${isOutOfStock ? '' : `addToCart('${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image_url}')`}" 
                    class="w-full py-1.5 rounded-lg text-[10px] font-bold transition btn-fresh-drop ${isOutOfStock ? 'disabled' : ''}"
                    ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                </button>
            </div>
        </div>`;
    });
}

// --- MODAL LOGIC (Popups) ---

function openProductModal(product) {
    document.getElementById('modal-img').src = product.image_url;
    document.getElementById('modal-name').innerText = product.name;
    document.getElementById('modal-price').innerText = `Le ${product.price}`;
    
    document.getElementById('modal-desc').innerText = product.description || "No description available.";
    
    const stockEl = document.getElementById('modal-stock');
    if(product.stock > 0) {
        stockEl.innerText = `${product.stock} In Stock`;
        stockEl.className = "text-[10px] font-bold uppercase tracking-widest text-white bg-green-600 px-2 py-1 rounded";
    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.className = "text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 px-2 py-1 rounded";
    }

    const btn = document.getElementById('modal-add-btn');
    if(product.stock > 0) {
        btn.disabled = false;
        btn.classList.remove('bg-gray-300', 'cursor-not-allowed');
        btn.classList.add('gold-btn');
        btn.innerText = "Add to Cart";
        btn.onclick = () => {
            addToCart(product.name, product.price, product.image_url);
            closeProductModal();
        };
    } else {
        btn.disabled = true;
        btn.classList.remove('gold-btn');
        btn.classList.add('bg-gray-300', 'cursor-not-allowed');
        btn.innerText = "Unavailable";
    }
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}


// --- NAVIGATION LOGIC ---

function openCategory(categoryName) {
    hideAllViews();
    const categoryView = document.getElementById('category-view');
    
    if (categoryView) {
        categoryView.classList.remove('hidden');
        document.getElementById('category-title').innerText = categoryName;
        
        let items = allProductsCache.filter(p => p.category === categoryName);
        renderGrid(items, document.getElementById('category-grid'));
        window.scrollTo(0, 0);
    }
}

function openAllCollections() {
    hideAllViews();
    const collectionsView = document.getElementById('collections-view');
    const container = document.getElementById('collections-grid');

    if (collectionsView && container) {
        collectionsView.classList.remove('hidden');
        container.innerHTML = '';
        
        allCategoriesCache.forEach(cat => {
            const count = allProductsCache.filter(p => p.category === cat.name).length;
            container.innerHTML += `
            <div onclick="openCategory('${cat.name}')" class="relative h-40 rounded-xl overflow-hidden cursor-pointer group shadow-md">
                <img src="${cat.image_url}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition flex flex-col justify-center items-center text-white">
                    <h3 class="text-xl font-bold font-serif">${cat.name}</h3>
                    <p class="text-xs uppercase tracking-widest mt-1">${count} Items</p>
                </div>
            </div>`;
        });
        window.scrollTo(0, 0);
    }
}

function goHome() {
    hideAllViews();
    document.getElementById('home-view').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function hideAllViews() {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('category-view').classList.add('hidden');
    const colView = document.getElementById('collections-view');
    if(colView) colView.classList.add('hidden');
}

// --- THEME & EXTRAS ---
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// --- SEARCH & FAVORITES ---

function toggleHeart(id) { 
    if (favorites.includes(id)) favorites = favorites.filter(f => f !== id);
    else favorites.push(id);
    localStorage.setItem('bortehFavorites', JSON.stringify(favorites));
    fetchProducts();
}

function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    const favItems = allProductsCache.filter(p => favorites.includes(p.id));
    container.innerHTML = favItems.length === 0 ? '<p class="col-span-full text-center text-gray-400 mt-10">No favorites yet.</p>' : '';
    
    favItems.forEach(p => {
        const isOutOfStock = !p.stock || p.stock <= 0;

        container.innerHTML += `
            <div class="flex gap-4 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src="${p.image_url}" class="w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-50' : ''}">
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-primary text-lg">${p.name}</h4>
                    <p class="text-sm text-accent font-bold mb-2">Le ${p.price}</p>
                    
                    <button 
                        onclick="event.stopPropagation(); ${isOutOfStock ? '' : `addToCart('${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image_url}')`}" 
                        class="text-xs px-3 py-1 rounded font-bold transition ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white'}"
                        ${isOutOfStock ? 'disabled' : ''}>
                        ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                    </button>
                </div>
                <button onclick="event.stopPropagation(); toggleHeart(${p.id})" class="text-red-500 hover:text-red-700 p-2"><i class="fa-solid fa-trash text-xl"></i></button>
            </div>`;
    });
}

function handleSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    const term = query.toLowerCase().trim();
    if (term.length === 0) {
        resultsContainer.classList.add('hidden');
        return;
    }
    const matches = allProductsCache.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = '';
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<p class="p-4 text-xs text-gray-400 text-center">No products found.</p>';
    } else {
        matches.forEach(p => {
            const isOutOfStock = !p.stock || p.stock <= 0;

            resultsContainer.innerHTML += `
                <div onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer ${isOutOfStock ? 'opacity-60' : ''}">
                    <img src="${p.image_url}" class="w-10 h-10 rounded-md object-cover ${isOutOfStock ? 'grayscale' : ''}">
                    <div class="flex-1">
                        <p class="text-sm font-bold text-primary">${p.name}</p>
                        <p class="text-xs text-accent">Le ${p.price} ${isOutOfStock ? '<span class="text-red-500 ml-2">(Sold Out)</span>' : ''}</p>
                    </div>
                    
                    <button 
                        onclick="event.stopPropagation(); ${isOutOfStock ? '' : `addToCart('${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image_url}')`}" 
                        class="${isOutOfStock ? 'text-gray-300 cursor-not-allowed' : 'text-primary'}"
                        ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>`;
        });
    }
}

// --- PWA INSTALL & SERVICE WORKER ---

function initInstallButtons() {
    const buttons = document.querySelectorAll('.install-app-btn');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        buttons.forEach(btn => btn.style.display = 'flex');
    });
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
            }
        });
    });
    window.addEventListener('appinstalled', () => {
        buttons.forEach(btn => btn.style.display = 'none');
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('../service-worker.js')
        .then(reg => console.log('[App] Service Worker registered', reg))
        .catch(err => console.error('[App] Service Worker registration failed', err));
    });
}

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

// --- NOTIFICATION & BADGE LOGIC ---

let unreadCount = 0; // Track how many new items came in

// 1. Ask for permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

// 2. Listen for New Arrivals + Update Badge
function initRealtimeListener() {
    const subscription = window.supabaseClient
        .channel('public:products')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, (payload) => {
            console.log('New product detected!', payload);
            
            if (payload.new.is_new_arrival) {
                // Trigger the popup
                sendNotification(payload.new);
                
                // Trigger the Red Dot / Number
                unreadCount++;
                updateAppBadge(unreadCount);
            }
        })
        .subscribe();
}

// 3. Helper to set the Red Dot
function updateAppBadge(count) {
    if ('setAppBadge' in navigator) {
        // Sets the number on the icon (e.g., 1, 2, 3)
        navigator.setAppBadge(count).catch(error => console.error(error));
    }
}

// 4. Helper to Clear the Red Dot (Call this when user visits)
function clearAppBadge() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(error => console.error(error));
        unreadCount = 0;
    }
}

// 5. Trigger the actual visual notification
function sendNotification(product) {
    if (Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification("Fresh Drop! 🔥", {
                body: `${product.name} just arrived.`,
                icon: product.image_url,
                vibrate: [200, 100, 200],
                tag: 'new-arrival'
            });
        });
    } else {
        showToast(`New Drop: ${product.name}`);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories(); 
    fetchProducts();   
    loadTheme();
    initInstallButtons();

    // Search Listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
    
    // Wishlist check
    if (document.getElementById('favorites-list')) {
        setTimeout(renderFavorites, 500); 
    }

    // --- NEW LINES FOR NOTIFICATIONS & BADGES ---
    requestNotificationPermission(); // Ask permission
    initRealtimeListener();          // Start listening
    clearAppBadge();                 // Clear red dot because user is looking at the app now
    
    // Also clear badge if the user switches tabs and comes back
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            clearAppBadge();
        }
    });
});