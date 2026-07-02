// ==========================================
// Maison Admin Panel Application
// ==========================================

let adminUser = null;
let adminProducts = [];
let adminCategories = [];
let adminSettings = {};
let currentAdminPage = 1;
const ADMIN_ITEMS_PER_PAGE = 20;

// --- Auth ---
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        showLoginPage();
        return false;
    }
    adminUser = session.user;
    return true;
}

async function login(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        adminUser = data.user;
        showDashboard();
        showToast('Welcome back');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    adminUser = null;
    showLoginPage();
}

// --- Pages ---
function showLoginPage() {
    document.getElementById('admin-app').innerHTML = `
        <div class="login-page">
            <div class="login-card">
                <h1>Subhy Collection Admin</h1>
                <p>Sign in to manage your store</p>
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="login-email" required placeholder="admin@maison.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="admin-btn admin-btn-primary" style="margin-top:0.5rem;">Sign In</button>
                </form>
            </div>
        </div>
    `;
}

function handleLogin(e) {
    e.preventDefault();
    login(document.getElementById('login-email').value, document.getElementById('login-password').value);
}

function showDashboard() {
    document.getElementById('admin-app').innerHTML = `
        <div class="admin-layout">
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-logo">Subhy Collection</div>
                <button class="sidebar-link active" onclick="showDashboard(); return false;">
                    <span>◆</span> <span data-i18n="dashboard">${t('dashboard')}</span>
                </button>
                <button class="sidebar-link" onclick="showProductsPage(); return false;">
                    <span>◈</span> <span data-i18n="products">${t('products')}</span>
                </button>
                <button class="sidebar-link" onclick="showCategoriesPage(); return false;">
                    <span>◇</span> <span data-i18n="categories">${t('categories')}</span>
                </button>
                <button class="sidebar-link" onclick="showSettingsPage(); return false;">
                    <span>◉</span> <span data-i18n="settings">${t('settings')}</span>
                </button>
                <div class="sidebar-divider"></div>
                <button class="sidebar-link" onclick="logout(); return false;" style="color:var(--a-danger);">
                    <span>→</span> <span>Sign Out</span>
                </button>
                <div class="sidebar-footer">
                    Subhy Collection Admin v1.0<br>Secure & Private
                </div>
            </aside>
            <button class="sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
            <main class="admin-main" id="admin-main">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3 data-i18n="total_products">${t('total_products')}</h3>
                        <p id="stat-products">0</p>
                        <div class="stat-change">Total inventory</div>
                    </div>
                    <div class="stat-card">
                        <h3 data-i18n="total_categories">${t('total_categories')}</h3>
                        <p id="stat-categories">0</p>
                        <div class="stat-change">Active collections</div>
                    </div>
                    <div class="stat-card">
                        <h3 data-i18n="low_stock">${t('low_stock')}</h3>
                        <p id="stat-lowstock">0</p>
                        <div class="stat-change negative">Needs attention</div>
                    </div>
                </div>
                <div class="admin-header">
                    <h1>Latest Products</h1>
                </div>
                <div class="table-container">
                    <table class="admin-table">
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
                        <tbody id="latest-products"></tbody>
                    </table>
                </div>
            </main>
        </div>
    `;
    loadDashboardData();
}

async function loadDashboardData() {
    const [{ count: prodCount }, { count: catCount }, { data: lowStock }, { data: latest }] = await Promise.all([
        supabaseClient.from('products').select('*', { count: 'exact', head: true }),
        supabaseClient.from('categories').select('*', { count: 'exact', head: true }),
        supabaseClient.from('products').select('*').lt('stock', 10),
        supabaseClient.from('products').select('*').order('created_at', { ascending: false }).limit(5)
    ]);
    
    document.getElementById('stat-products').textContent = prodCount || 0;
    document.getElementById('stat-categories').textContent = catCount || 0;
    document.getElementById('stat-lowstock').textContent = lowStock?.length || 0;
    
    const tbody = document.getElementById('latest-products');
    tbody.innerHTML = (latest || []).map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.875rem;">
                    <img src="${p.main_image || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=100'}" alt="">
                    <div>
                        <div class="product-name-cell">${p.name}</div>
                        <div class="product-meta-cell">${p.sku}</div>
                    </div>
                </div>
            </td>
            <td class="product-meta-cell">${p.category_id ? 'Category' : '-'}</td>
            <td class="price-cell" data-price="${p.price}">${formatPrice(p.price)}</td>
            <td><span class="stock-cell ${p.stock < 10 ? 'low' : ''} ${p.stock <= 0 ? 'out' : ''}">${p.stock}</span></td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editProduct('${p.id}')">✎</button>
                <button class="btn-icon btn-danger" onclick="deleteProduct('${p.id}')">✕</button>
            </td>
        </tr>
    `).join('');
}

// --- Products Management ---
async function showProductsPage(page = 1) {
    currentAdminPage = page;
    document.getElementById('admin-main').innerHTML = `
        <div class="admin-header">
            <h1 data-i18n="products">${t('products')}</h1>
            <button class="admin-btn admin-btn-primary" onclick="openProductModal()">+ Add Product</button>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
                <tbody id="products-table">${Array(5).fill('<tr><td colspan="6" style="padding:1rem;"><div class="skeleton-text"></div></td></tr>').join('')}</tbody>
            </table>
        </div>
        <div id="admin-pagination" class="pagination"></div>
    `;
    
    await loadProductsTable(page);
}

async function loadProductsTable(page) {
    const from = (page - 1) * ADMIN_ITEMS_PER_PAGE;
    const to = from + ADMIN_ITEMS_PER_PAGE - 1;
    
    const { data, count, error } = await supabaseClient.from('products')
        .select('*, categories(name)', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });
    
    if (error) { showToast(error.message, 'error'); return; }
    
    adminProducts = data || [];
    const totalPages = Math.ceil((count || 0) / ADMIN_ITEMS_PER_PAGE);
    
    const tbody = document.getElementById('products-table');
    tbody.innerHTML = adminProducts.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.875rem;">
                    <img src="${p.main_image || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=100'}" alt="">
                    <div>
                        <div class="product-name-cell">${p.name}</div>
                        <div class="product-meta-cell">${p.sku}</div>
                    </div>
                </div>
            </td>
            <td class="product-meta-cell">${p.categories?.name || '-'}</td>
            <td class="price-cell" data-price="${p.price}">${formatPrice(p.price)}</td>
            <td><span class="stock-cell ${p.stock < 10 ? 'low' : ''} ${p.stock <= 0 ? 'out' : ''}">${p.stock}</span></td>
            <td>
                ${p.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
                ${p.hidden ? '<span class="badge badge-hidden">Hidden</span>' : ''}
            </td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editProduct('${p.id}')">✎</button>
                <button class="btn-icon" onclick="duplicateProduct('${p.id}')">⎘</button>
                <button class="btn-icon btn-danger" onclick="deleteProduct('${p.id}')">✕</button>
            </td>
        </tr>
    `).join('');
    
    renderAdminPagination('admin-pagination', totalPages, page, showProductsPage);
}

function renderAdminPagination(id, total, current, callback) {
    const container = document.getElementById(id);
    if (!container || total <= 1) return;
    let html = `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="${callback.name}(${current - 1})">← Prev</button>`;
    for (let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${callback.name}(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${current === total ? 'disabled' : ''} onclick="${callback.name}(${current + 1})">Next →</button>`;
    container.innerHTML = html;
}

// --- Product Modal ---
let editingProductId = null;
let uploadedImages = [];

function openProductModal(product = null) {
    editingProductId = product?.id || null;
    uploadedImages = product?.gallery_images || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'product-modal';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${editingProductId ? 'Edit Product' : 'Add New Product'}</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <form id="product-form" onsubmit="saveProduct(event)">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label data-i18n="product_name">${t('product_name')}</label>
                            <input type="text" id="p-name" value="${product?.name || ''}" required placeholder="Product name">
                        </div>
                        <div class="form-group">
                            <label data-i18n="sku">${t('sku')}</label>
                            <input type="text" id="p-sku" value="${product?.sku || ''}" required placeholder="SKU-001">
                        </div>
                    </div>
                    <div class="form-group">
                        <label data-i18n="description">${t('description')}</label>
                        <textarea id="p-description" placeholder="Describe the product...">${product?.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label data-i18n="price">${t('price')} (TZS)</label>
                            <input type="number" id="p-price" step="1" value="${product?.price || ''}" required placeholder="50000">
                        </div>
                        <div class="form-group">
                            <label data-i18n="stock">${t('stock')}</label>
                            <input type="number" id="p-stock" value="${product?.stock || 0}" required placeholder="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label data-i18n="category">${t('category')}</label>
                            <select id="p-category" required>
                                <option value="">Select category...</option>
                                ${adminCategories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label data-i18n="brand">${t('brand')}</label>
                            <input type="text" id="p-brand" value="${product?.brand || ''}" placeholder="Brand name">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="p-featured" ${product?.featured ? 'checked' : ''}>
                            <label for="p-featured" data-i18n="featured_product">${t('featured_product')}</label>
                        </div>
                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="p-hidden" ${product?.hidden ? 'checked' : ''}>
                            <label for="p-hidden" data-i18n="hidden">${t('hidden')}</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label data-i18n="upload_images">${t('upload_images')}</label>
                        <div class="dropzone" id="dropzone" onclick="document.getElementById('file-input').click()">
                            <p class="dropzone-text"><strong>Click to upload</strong> or drag and drop images here</p>
                            <input type="file" id="file-input" multiple accept="image/*" style="display:none" onchange="handleFileSelect(event)">
                        </div>
                        <div class="image-preview-grid" id="image-preview"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="closeModal()" data-i18n="cancel">${t('cancel')}</button>
                    <button type="submit" class="admin-btn admin-btn-primary" data-i18n="save">${t('save')}</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    const dropzone = document.getElementById('dropzone');
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    
    renderImagePreviews();
}

async function handleFileSelect(e) { await handleFiles(e.target.files); }

async function handleFiles(files) {
    for (const file of files) {
        try {
            showToast('Compressing image...');
            const compressed = await compressImage(file);
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
            
            const { data, error } = await supabaseClient.storage.from('products').upload(fileName, compressed);
            if (error) throw error;
            
            const { data: { publicUrl } } = supabaseClient.storage.from('products').getPublicUrl(fileName);
            uploadedImages.push(publicUrl);
            renderImagePreviews();
            showToast('Image uploaded');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

function renderImagePreviews() {
    const container = document.getElementById('image-preview');
    if (!container) return;
    container.innerHTML = uploadedImages.map((img, i) => `
        <div class="image-preview">
            <img src="${img}" alt="">
            <button class="remove-btn" onclick="removeImage(${i})">✕</button>
        </div>
    `).join('');
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreviews();
}

async function saveProduct(e) {
    e.preventDefault();
    const product = {
        name: document.getElementById('p-name').value,
        sku: document.getElementById('p-sku').value,
        description: document.getElementById('p-description').value,
        price: parseFloat(document.getElementById('p-price').value),
        stock: parseInt(document.getElementById('p-stock').value),
        category_id: document.getElementById('p-category').value,
        brand: document.getElementById('p-brand').value,
        featured: document.getElementById('p-featured').checked,
        hidden: document.getElementById('p-hidden').checked,
        main_image: uploadedImages[0] || null,
        gallery_images: uploadedImages.slice(1)
    };
    
    try {
        if (editingProductId) {
            const { error } = await supabaseClient.from('products').update(product).eq('id', editingProductId);
            if (error) throw error;
            showToast('Product updated successfully');
        } else {
            const { error } = await supabaseClient.from('products').insert(product);
            if (error) throw error;
            showToast('Product added successfully');
        }
        closeModal();
        showProductsPage(currentAdminPage);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function editProduct(id) {
    const product = adminProducts.find(p => p.id === id);
    if (product) openProductModal(product);
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        showToast('Product deleted');
        showProductsPage(currentAdminPage);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function duplicateProduct(id) {
    const product = adminProducts.find(p => p.id === id);
    if (!product) return;
    const newProduct = { ...product };
    delete newProduct.id;
    delete newProduct.created_at;
    newProduct.name = `${newProduct.name} (Copy)`;
    newProduct.sku = `${newProduct.sku}-COPY`;
    
    try {
        const { error } = await supabaseClient.from('products').insert(newProduct);
        if (error) throw error;
        showToast('Product duplicated');
        showProductsPage(currentAdminPage);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- Categories ---
async function showCategoriesPage() {
    document.getElementById('admin-main').innerHTML = `
        <div class="admin-header">
            <h1 data-i18n="categories">${t('categories')}</h1>
            <button class="admin-btn admin-btn-primary" onclick="openCategoryModal()">+ Add Category</button>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead><tr><th>Name</th><th>Description</th><th></th></tr></thead>
                <tbody id="categories-table"></tbody>
            </table>
        </div>
    `;
    await loadCategoriesTable();
}

async function loadCategoriesTable() {
    const { data, error } = await supabaseClient.from('categories').select('*').order('name');
    if (error) { showToast(error.message, 'error'); return; }
    adminCategories = data || [];
    
    document.getElementById('categories-table').innerHTML = adminCategories.map(c => `
        <tr>
            <td class="product-name-cell">${c.name}</td>
            <td class="product-meta-cell">${c.description || '-'}</td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editCategory('${c.id}')">✎</button>
                <button class="btn-icon btn-danger" onclick="deleteCategory('${c.id}')">✕</button>
            </td>
        </tr>
    `).join('');
}

function openCategoryModal(category = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'category-modal';
    modal.innerHTML = `
        <div class="modal" style="max-width:500px;">
            <div class="modal-header">
                <h2>${category ? 'Edit Category' : 'Add Category'}</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <form onsubmit="saveCategory(event, '${category?.id || ''}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="c-name" value="${category?.name || ''}" required placeholder="Category name">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="c-description" placeholder="Brief description...">${category?.description || ''}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button type="submit" class="admin-btn admin-btn-primary">${t('save')}</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function saveCategory(e, id) {
    e.preventDefault();
    const category = {
        name: document.getElementById('c-name').value,
        description: document.getElementById('c-description').value
    };
    try {
        if (id) {
            await supabaseClient.from('categories').update(category).eq('id', id);
        } else {
            await supabaseClient.from('categories').insert(category);
        }
        closeModal();
        showCategoriesPage();
        showToast('Category saved');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function editCategory(id) {
    const cat = adminCategories.find(c => c.id === id);
    if (cat) openCategoryModal(cat);
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? Products may be affected.')) return;
    try {
        await supabaseClient.from('categories').delete().eq('id', id);
        showCategoriesPage();
        showToast('Category deleted');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- Settings ---
async function showSettingsPage() {
    const { data } = await supabaseClient.from('settings').select('*').single();
    adminSettings = data || {};
    
    document.getElementById('admin-main').innerHTML = `
        <div class="admin-header">
            <h1 data-i18n="settings">${t('settings')}</h1>
        </div>
        <div class="table-container" style="padding:2rem;max-width:600px;">
            <form onsubmit="saveSettings(event)">
                <div class="form-group">
                    <label data-i18n="company_name">${t('company_name')}</label>
                    <input type="text" id="s-name" value="${adminSettings.company_name || ''}" placeholder="Subhy Collection">
                </div>
                <div class="form-group">
                    <label data-i18n="whatsapp_number">${t('whatsapp_number')}</label>
                    <input type="text" id="s-whatsapp" value="${adminSettings.whatsapp_number || ''}" placeholder="255XXXXXXXXX">
                </div>
                <div class="form-group">
                    <label data-i18n="primary_color">${t('primary_color')}</label>
                    <input type="color" id="s-color" value="${adminSettings.primary_color || '#c75b39'}" style="width:60px;height:40px;padding:0;border:none;cursor:pointer;">
                </div>
                <div class="form-group">
                    <label data-i18n="footer_text">${t('footer_text')}</label>
                    <textarea id="s-footer" placeholder="Footer text...">${adminSettings.footer_text || ''}</textarea>
                </div>
                <button type="submit" class="admin-btn admin-btn-primary" data-i18n="save">${t('save')}</button>
            </form>
        </div>
    `;
}

async function saveSettings(e) {
    e.preventDefault();
    const settings = {
        company_name: document.getElementById('s-name').value,
        whatsapp_number: document.getElementById('s-whatsapp').value,
        primary_color: document.getElementById('s-color').value,
        footer_text: document.getElementById('s-footer').value
    };
    try {
        const { data: existing } = await supabaseClient.from('settings').select('id').single();
        if (existing) {
            await supabaseClient.from('settings').update(settings).eq('id', existing.id);
        } else {
            await supabaseClient.from('settings').insert(settings);
        }
        showToast('Settings saved');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- Utils ---
function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    const authed = await checkAuth();

    if (authed) {
        const { data: cats } = await supabaseClient
            .from('categories')
            .select('*');

        adminCategories = cats || [];
        showDashboard();
    }
});
