// js/admin.js

let allProducts = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. NEW: Apply saved theme immediately on load
    if (typeof loadTheme === 'function') {
        loadTheme();
    }

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

    // NEW: Listener for Category Edit Form
    const editCategoryForm = document.getElementById('edit-category-form');
    if(editCategoryForm) editCategoryForm.addEventListener('submit', handleEditCategory);
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
    renderCategoryList(data); // NEW: Render the management table
}

// NEW: Render the Category Management Table
function renderCategoryList(categories) {
    const list = document.getElementById('category-list');
    if(!list) return;
    list.innerHTML = '';

    categories.forEach(cat => {
        list.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-black/20 group border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="${cat.image_url}" class="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-200 dark:border-gray-700">
                        <p class="font-bold text-primary">${cat.name}</p>
                    </div>
                </td>
                <td class="p-4 text-right">
                    <button onclick="openEditCategoryModal(${cat.id})" class="text-blue-500 hover:text-blue-700 px-2 py-1 transition"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteCategory(${cat.id}, '${cat.name}')" class="text-red-400 hover:text-red-600 px-2 py-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
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
    container.innerHTML = `<button onclick="filterInventory('all')" class="px-4 py-1 text-[10px] uppercase font-bold rounded-full bg-[#5D4037] text-white">All</button>`;
    categories.forEach(cat => {
        container.innerHTML += `<button onclick="filterInventory('${cat.name}')" class="px-4 py-1 text-[10px] uppercase font-bold rounded-full text-gray-500 hover:bg-gray-100 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">${cat.name}</button>`;
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

        // CHANGED: Replaced alert
        showToast('Category Created!');
        
        e.target.reset();
        document.getElementById('cat-preview-tag').classList.add('hidden');
        document.getElementById('cat-upload-icon').classList.remove('hidden');
        fetchCategories();

    } catch (error) {
        // CHANGED: Replaced alert
        showToast('Error: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteCategory(id, name) {
    const { count, error } = await window.supabaseClient
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', name);

    // CHANGED: Replaced alert
    if (error) return showToast("Error checking category usage.");

    if (count > 0) {
        // CHANGED: Replaced alert
        return showToast(`Cannot delete category "${name}" because it contains ${count} products. Please remove or move these products first.`);
    }

    if (!confirm(`Are you sure you want to delete the empty category "${name}"?`)) return;

    const { error: delError } = await window.supabaseClient
        .from('categories')
        .delete()
        .eq('id', id);

    // CHANGED: Replaced alert
    if (delError) showToast('Error deleting: ' + delError.message);
    else fetchCategories();
}

function openEditCategoryModal(id) {
    const cat = allCategories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('edit-cat-name').value = cat.name;
    document.getElementById('edit-cat-preview').src = cat.image_url;
    document.getElementById('edit-cat-icon').classList.add('hidden');
    
    document.getElementById('edit-category-modal').classList.remove('hidden');
}

function closeEditCategoryModal() {
    document.getElementById('edit-category-modal').classList.add('hidden');
}

async function handleEditCategory(e) {
    e.preventDefault();
    const id = document.getElementById('edit-cat-id').value;
    const name = document.getElementById('edit-cat-name').value;
    const file = document.getElementById('edit-cat-file').files[0];
    const btn = e.target.querySelector('button');
    
    btn.innerText = 'Updating...';
    
    try {
        let updateData = { name: name };

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `category_${Date.now()}.${fileExt}`;
            
            const { error: imgError } = await window.supabaseClient.storage
                .from('product-images')
                .upload(fileName, file);
            
            if (imgError) throw imgError;

            const { data: urlData } = window.supabaseClient.storage
                .from('product-images')
                .getPublicUrl(fileName);
            
            updateData.image_url = urlData.publicUrl;
        }

        const { error } = await window.supabaseClient
            .from('categories')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // CHANGED: Replaced alert
        showToast('Category Updated!');
        
        closeEditCategoryModal();
        fetchCategories();

    } catch (error) {
        // CHANGED: Replaced alert
        showToast('Update failed: ' + error.message);
    } finally {
        btn.innerText = 'Update Category';
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

    // CHANGED: Replaced alert
    if (error) return showToast('Error loading products');

    allProducts = data;
    renderInventory(data);
}

function renderInventory(products) {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';

    if (products.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400">No items found.</td></tr>';
        return;
    }

    products.forEach(p => {
        list.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-black/20 group border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="${p.image_url}" class="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200 dark:border-gray-700">
                        <div>
                            <p class="font-bold text-primary">${p.name}</p>
                            <p class="text-xs text-gray-500">${p.category}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4 text-center">
                    <span class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-bold">
                       ${p.stock || 0} left
                    </span>
                </td>
                <td class="p-4 font-bold text-primary">Le ${p.price}</td>
                <td class="p-4 text-right">
                    <button onclick="openEditModal(${p.id})" class="text-blue-500 hover:text-blue-700 px-2 py-1 transition"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteProduct(${p.id})" class="text-red-400 hover:text-red-600 px-2 py-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

async function handleAddProduct(e) {
    e.preventDefault();
    const categorySelect = document.getElementById('p-category');
    const category = categorySelect.value;

    // CHANGED: Replaced alert
    if (!category) return showToast("Please select a category first.");

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Publishing...';
    btn.disabled = true;

    try {
        const file = document.getElementById('p-image-file').files[0];
        const name = document.getElementById('p-name').value;
        const price = document.getElementById('p-price').value;
        const desc = document.getElementById('p-desc').value; 
        const stock = document.getElementById('p-stock').value; 
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
            description: desc,  
            stock: stock,       
            category: category, 
            image_url: urlData.publicUrl, 
            is_new_arrival: isNew
        }]);

        if (dbError) throw dbError;

        // CHANGED: Replaced alert
        showToast('Product Added!');
        
        e.target.reset();
        document.getElementById('image-preview-tag').classList.add('hidden');
        document.getElementById('upload-preview').classList.remove('hidden');
        fetchProducts();

    } catch (error) {
        // CHANGED: Replaced alert
        showToast(error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const { error } = await window.supabaseClient.from('products').delete().eq('id', id);
    
    // CHANGED: Replaced alert
    if (error) showToast('Error deleting: ' + error.message);
    else fetchProducts();
}


// --- EDIT PRODUCT LOGIC ---

function openEditModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
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
    const desc = document.getElementById('edit-desc').value;    
    const stock = document.getElementById('edit-stock').value;  
    const category = document.getElementById('edit-category').value;
    
    const btn = e.target.querySelector('button');
    btn.innerText = 'Updating...';

    const { error } = await window.supabaseClient.from('products')
        .update({ 
            name, 
            price, 
            description: desc, 
            stock: stock,      
            category 
        })
        .eq('id', id);

    // CHANGED: Replaced alert
    if (error) showToast('Update failed: ' + error.message);
    else {
        showToast('Product updated!');
        closeEditModal();
        fetchProducts();
    }
    btn.innerText = 'Save Changes';
}

function filterInventory(category) {
    const buttons = document.querySelectorAll('#category-filters button');
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase() === category.toLowerCase() || (category === 'all' && btn.innerText.toLowerCase() === 'all')) {
            btn.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-500');
            btn.classList.add('bg-[#5D4037]', 'text-white');
        } else {
            btn.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-500');
            btn.classList.remove('bg-[#5D4037]', 'text-white');
        }
    });

    if (category === 'all') renderInventory(allProducts);
    else renderInventory(allProducts.filter(p => p.category === category));
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