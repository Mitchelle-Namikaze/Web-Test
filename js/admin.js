// js/admin.js

let allProducts = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. CHECK: Are we on the Login Page?
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        return; 
    }

    // 2. CHECK: Are we on the Dashboard?
    const session = localStorage.getItem('supabase.auth.token');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    fetchCategories(); 
    fetchProducts();   
    
    const addProductForm = document.getElementById('add-product-form');
    if(addProductForm) addProductForm.addEventListener('submit', handleAddProduct);

    const addCategoryForm = document.getElementById('add-category-form');
    if(addCategoryForm) addCategoryForm.addEventListener('submit', handleAddCategory);

    const editProductForm = document.getElementById('edit-product-form');
    if(editProductForm) editProductForm.addEventListener('submit', handleEditSave);
});


// --- LOGIN LOGIC ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button');
    const errorMsg = document.getElementById('error-msg');

    btn.innerText = 'Verifying...';
    errorMsg.classList.add('hidden');

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        localStorage.setItem('supabase.auth.token', data.session.access_token);
        window.location.href = 'dashboard.html';

    } catch (error) {
        btn.innerText = 'Enter Dashboard';
        errorMsg.innerText = error.message || 'Invalid login credentials';
        errorMsg.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('supabase.auth.token');
    window.supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}


// --- CATEGORY LOGIC ---
async function fetchCategories() {
    const { data, error } = await window.supabaseClient
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) return console.error('Error categories:', error);

    allCategories = data;
    populateCategoryDropdowns(data);
    populateCategoryFilters(data);
}

function populateCategoryDropdowns(categories) {
    const dropdowns = ['p-category', 'edit-category'];
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Select...</option>';
        categories.forEach(cat => {
            select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        });
    });
}

function populateCategoryFilters(categories) {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = `<button onclick="filterInventory('all')" class="px-4 py-1 text-xs font-bold rounded-md bg-[#5D4037] text-white">All</button>`;
    categories.forEach(cat => {
        container.innerHTML += `<button onclick="filterInventory('${cat.name}')" class="px-4 py-1 text-xs font-bold rounded-md text-gray-500 hover:bg-gray-100 bg-white border border-gray-100">${cat.name}</button>`;
    });
}

async function handleAddCategory(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const name = document.getElementById('c-name').value;
        const file = document.getElementById('c-image-file').files[0];

        if (!file) throw new Error("Please select a category image.");

        const fileExt = file.name.split('.').pop();
        const fileName = `category_${Date.now()}.${fileExt}`;
        
        const { error: imgError } = await window.supabaseClient.storage
            .from('product-images') 
            .upload(fileName, file);

        if (imgError) throw imgError;

        const { data: publicUrlData } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName);

        const { error: dbError } = await window.supabaseClient
            .from('categories')
            .insert([{ name: name, image_url: publicUrlData.publicUrl }]);

        if (dbError) throw dbError;

        alert('Category Created!');
        e.target.reset();
        document.getElementById('cat-preview-tag').classList.add('hidden');
        document.getElementById('cat-upload-icon').classList.remove('hidden');
        fetchCategories();

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


// --- PRODUCT LOGIC ---
async function fetchProducts() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400">Loading...</td></tr>';

    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: false });

    if (error) return alert('Error loading products');

    allProducts = data;
    renderInventory(data);
}

// Updated to show Stock
function renderInventory(products) {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';

    if (products.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400">No items found.</td></tr>';
        return;
    }

    products.forEach(p => {
        list.innerHTML += `
            <tr class="hover:bg-gray-50 group">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="${p.image_url}" class="w-10 h-10 rounded-lg object-cover bg-gray-100">
                        <div>
                            <p class="font-bold text-gray-800">${p.name}</p>
                            <p class="text-xs text-gray-500">${p.category}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4 text-center">
                    <span class="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                       ${p.stock || 0} left
                    </span>
                </td>
                <td class="p-4 font-bold text-gray-700">Le ${p.price}</td>
                <td class="p-4 text-right">
                    <button onclick="openEditModal(${p.id})" class="text-blue-500 hover:text-blue-700 px-2 py-1 transition"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteProduct(${p.id})" class="text-red-400 hover:text-red-600 px-2 py-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// Updated to save Description and Stock
async function handleAddProduct(e) {
    e.preventDefault();
    const categorySelect = document.getElementById('p-category');
    const category = categorySelect.value;

    if (!category) return alert("Please select a category first.");

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Publishing...';
    btn.disabled = true;

    try {
        const file = document.getElementById('p-image-file').files[0];
        const name = document.getElementById('p-name').value;
        const price = document.getElementById('p-price').value;
        const desc = document.getElementById('p-desc').value; // New Field
        const stock = document.getElementById('p-stock').value; // New Field
        const isNew = document.getElementById('p-new').checked;

        if (!file) throw new Error("Please select an image");

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await window.supabaseClient.storage
            .from('product-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName);

        const { error: dbError } = await window.supabaseClient.from('products').insert([{
            name: name, 
            price: price, 
            description: desc,  // Saving Desc
            stock: stock,       // Saving Stock
            category: category, 
            image_url: urlData.publicUrl, 
            is_new_arrival: isNew
        }]);

        if (dbError) throw dbError;

        alert('Product Added!');
        e.target.reset();
        document.getElementById('image-preview-tag').classList.add('hidden');
        document.getElementById('upload-preview').classList.remove('hidden');
        fetchProducts();

    } catch (error) {
        alert(error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const { error } = await window.supabaseClient.from('products').delete().eq('id', id);
    if (error) alert('Error deleting: ' + error.message);
    else fetchProducts();
}


// --- EDIT LOGIC (Updated) ---

function openEditModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
    // Populate new fields
    document.getElementById('edit-desc').value = product.description || ''; 
    document.getElementById('edit-stock').value = product.stock || 0;
    
    document.getElementById('edit-category').value = product.category;
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function handleEditSave(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const price = document.getElementById('edit-price').value;
    const desc = document.getElementById('edit-desc').value;    // New
    const stock = document.getElementById('edit-stock').value;  // New
    const category = document.getElementById('edit-category').value;
    
    const btn = e.target.querySelector('button');
    btn.innerText = 'Updating...';

    const { error } = await window.supabaseClient.from('products')
        .update({ 
            name, 
            price, 
            description: desc, // Update Desc
            stock: stock,      // Update Stock
            category 
        })
        .eq('id', id);

    if (error) alert('Update failed: ' + error.message);
    else {
        alert('Product updated!');
        closeEditModal();
        fetchProducts();
    }
    btn.innerText = 'Save Changes';
}

function filterInventory(category) {
    const buttons = document.querySelectorAll('#category-filters button');
    buttons.forEach(btn => {
        if (btn.innerText === category || (category === 'all' && btn.innerText === 'All')) {
            btn.classList.remove('bg-white', 'text-gray-500', 'border', 'border-gray-100');
            btn.classList.add('bg-[#5D4037]', 'text-white');
        } else {
            btn.classList.add('bg-white', 'text-gray-500', 'border', 'border-gray-100');
            btn.classList.remove('bg-[#5D4037]', 'text-white');
        }
    });

    if (category === 'all') renderInventory(allProducts);
    else renderInventory(allProducts.filter(p => p.category === category));
}