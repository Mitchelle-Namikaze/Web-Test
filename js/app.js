// js/app.js

let allProductsCache = [];
let allCategoriesCache = []; // New Cache for categories
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

    if (error) return console.error('Error products:', error);

    allProductsCache = data;

    // Render Home Sections
    const newArrivals = document.getElementById('new-arrivals-container');
    if (newArrivals) renderHorizontalList(data.filter(p => p.is_new_arrival), newArrivals);

    const mainGrid = document.getElementById('all-products-grid');
    if (mainGrid) renderGrid(data, mainGrid);
    
    if (document.getElementById('favorites-list')) renderFavorites();
}

// --- RENDER FUNCTIONS ---

function renderCategoryCircles(categories) {
    const container = document.getElementById('categories-bar');
    if (!container) return;
    
    container.innerHTML = '';

    categories.forEach(cat => {
        container.innerHTML += `
        <div onclick="openCategory('${cat.name}')" class="flex flex-col items-center min-w-[80px] cursor-pointer group">
            <div class="cat-circle">
                <img src="${cat.image_url}" alt="${cat.name}">
            </div>
            <span class="text-xs font-bold text-primary mt-2">${cat.name}</span>
        </div>`;
    });

    container.innerHTML += `
        <div onclick="openAllCollections()" class="flex flex-col items-center min-w-[80px] cursor-pointer group">
            <div class="cat-circle bg-[#C6A87C] border-none">
                <i class="fa-solid fa-arrow-right text-2xl text-white"></i>
            </div>
            <span class="text-xs font-bold text-primary mt-2">View All</span>
        </div>
    `;
}

// UPDATED: Now handles Descriptions and "Read More"
function renderGrid(products, container) {
    if (!container) return;
    container.innerHTML = products.length === 0 ? '<p class="col-span-full text-center text-gray-400">No items available.</p>' : '';
    
    products.forEach(p => {
        const isFav = favorites.includes(p.id);
        
        // Logic to truncate description
        let descHtml = '';
        if (p.description) {
            // If text is longer than 45 characters, cut it and show button
            if (p.description.length > 45) {
                // We use replace(/'/g, "&#39;") to prevent quotes from breaking the HTML
                descHtml = `
                    <p class="text-[10px] text-gray-500 mb-1 line-clamp-2">${p.description.substring(0, 45)}...</p>
                    <button onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="text-[10px] font-bold text-accent hover:underline mb-3">Read More</button>
                `;
            } else {
                descHtml = `<p class="text-[10px] text-gray-500 mb-3">${p.description}</p>`;
            }
        }

        container.innerHTML += `
        <div class="product-card p-3 relative flex flex-col h-full">
            <button onclick="toggleHeart(${p.id})" class="absolute top-2 right-2 z-10 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                <i class="${isFav ? 'fa-solid text-red-500' : 'fa-regular text-gray-400'} fa-heart"></i>
            </button>
            <div class="h-36 bg-gray-100 rounded-xl mb-2 overflow-hidden shrink-0">
                <img src="${p.image_url}" class="w-full h-full object-cover">
            </div>
            <h4 class="font-bold text-primary text-sm truncate serif-font">${p.name}</h4>
            
            ${descHtml}
            
            <div class="mt-auto">
                <p class="text-accent font-bold text-xs mb-2">Le ${p.price}</p>
                <button onclick="addToCart('${p.name}', ${p.price})" class="w-full py-2 rounded-lg text-xs font-bold border border-[var(--text-primary)] text-primary hover:bg-primary hover:text-white transition">Add to Cart</button>
            </div>
        </div>`;
    });
}

function renderHorizontalList(products, container) {
    if (!container) return;
    container.innerHTML = products.length === 0 ? '<p class="text-xs text-gray-400">No new drops.</p>' : '';
    products.forEach(p => {
        container.innerHTML += `
        <div class="min-w-[160px] product-card p-3 flex-shrink-0">
            <div class="h-32 bg-gray-100 rounded-xl mb-2 overflow-hidden"><img src="${p.image_url}" class="w-full h-full object-cover"></div>
            <h4 class="font-bold text-primary text-sm truncate serif-font">${p.name}</h4>
            <div class="flex justify-between items-center mt-1">
                <span class="text-accent font-bold text-xs">Le ${p.price}</span>
                <button onclick="addToCart('${p.name}', ${p.price})" class="w-6 h-6 bg-primary text-white rounded-full">+</button>
            </div>
        </div>`;
    });
}

// --- NEW: MODAL LOGIC (Popups) ---

function openProductModal(product) {
    // 1. Set Image
    document.getElementById('modal-img').src = product.image_url;
    
    // 2. Set Text Details
    document.getElementById('modal-name').innerText = product.name;
    document.getElementById('modal-price').innerText = `Le ${product.price}`;
    document.getElementById('modal-desc').innerText = product.description || "No description available.";
    
    // 3. Set Stock Logic (Green for stock, Red for out)
    const stockEl = document.getElementById('modal-stock');
    if(product.stock > 0) {
        stockEl.innerText = `${product.stock} In Stock`;
        stockEl.className = "text-[10px] font-bold uppercase tracking-widest text-white bg-green-600 px-2 py-1 rounded";
    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.className = "text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 px-2 py-1 rounded";
    }

    // 4. Bind the "Add to Cart" button inside the modal
    const btn = document.getElementById('modal-add-btn');
    btn.onclick = () => {
        addToCart(product.name, product.price);
        closeProductModal();
    };

    // 5. Show the modal
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
        container.innerHTML += `
            <div class="flex gap-4 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img src="${p.image_url}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-primary text-lg">${p.name}</h4>
                    <p class="text-sm text-accent font-bold mb-2">Le ${p.price}</p>
                    <button onclick="addToCart('${p.name}', ${p.price})" class="text-xs bg-black text-white px-3 py-1 rounded">Add to Cart</button>
                </div>
                <button onclick="toggleHeart(${p.id})" class="text-red-500 hover:text-red-700 p-2"><i class="fa-solid fa-trash text-xl"></i></button>
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
            resultsContainer.innerHTML += `
                <div onclick="addToCart('${p.name}', ${p.price})" class="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                    <img src="${p.image_url}" class="w-10 h-10 rounded-md object-cover">
                    <div class="flex-1">
                        <p class="text-sm font-bold text-primary">${p.name}</p>
                        <p class="text-xs text-accent">Le ${p.price}</p>
                    </div>
                    <i class="fa-solid fa-plus text-primary"></i>
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
      // Points to root because service-worker.js is in the same folder as index.html
      // Using '../' because app.js is inside the /js/ folder
      navigator.serviceWorker.register('../service-worker.js')
        .then(reg => console.log('[App] Service Worker registered', reg))
        .catch(err => console.error('[App] Service Worker registration failed', err));
    });
}