// ==========================================
// Maison Customer SPA Application
// ==========================================

let products = [];
let categories = [];
let settings = {};
let currentPage = 1;
let totalPages = 1;
const ITEMS_PER_PAGE = 12;

// --- Data Fetching ---
async function fetchProducts(filters = {}, page = 1) {
    showSkeleton('products-grid');
    try {
        let query = supabaseClient.from('products').select('*', { count: 'exact' });
        
        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        if (filters.category) query = query.eq('category_id', filters.category);
        if (filters.brand) query = query.eq('brand', filters.brand);
        if (filters.availability === 'in_stock') query = query.gt('stock', 0);
        if (filters.availability === 'out_of_stock') query = query.eq('stock', 0);
        if (filters.minPrice) query = query.gte('price', filters.minPrice);
        if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
        if (filters.featured) query = query.eq('featured', true);
        
        const sortMap = {
            'newest': { column: 'created_at', asc: false },
            'oldest': { column: 'created_at', asc: true },
            'price_asc': { column: 'price', asc: true },
            'price_desc': { column: 'price', asc: false },
            'name': { column: 'name', asc: true }
        };
        const sort = sortMap[filters.sort] || sortMap['newest'];
        query = query.order(sort.column, { ascending: sort.asc });
        
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);
        
        const { data, count, error } = await query;
        if (error) throw error;
        
        totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
        return data || [];
    } catch (err) {
        console.error('Error fetching products:', err);
        showToast(t('error'), 'error');
        return [];
    }
}

async function fetchCategories() {
    try {
        const { data, error } = await supabaseClient.from('categories').select('*').order('name');
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching categories:', err);
        return [];
    }
}

async function fetchSettings() {
    try {
        const { data, error } = await supabaseClient.from('settings').select('*').single();
        if (error) throw error;
        settings = data || {};
        applySettings();
        return settings;
    } catch (err) {
        console.error('Error fetching settings:', err);
        return {};
    }
}

async function fetchProductById(id) {
    try {
        const { data, error } = await supabaseClient.from('products').select('*, categories(*)').eq('id', id).single();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching product:', err);
        return null;
    }
}

async function fetchRelatedProducts(categoryId, excludeId) {
    try {
        const { data, error } = await supabaseClient.from('products')
            .select('*')
            .eq('category_id', categoryId)
            .neq('id', excludeId)
            .limit(4);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching related:', err);
        return [];
    }
}

// --- Rendering ---
function getWhatsAppLink(product) {
    const num = settings.whatsapp_number || '';
    const text = `Hi, I'm interested in ordering:\n\n*${product.name}*\nPrice: ${formatPrice(product.price)}\nSKU: ${product.sku}\n\n${window.location.origin}/product/${product.id}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function renderProductCard(product) {
    const imageUrl = product.main_image || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop';
    const isNew = new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const badge = product.stock <= 0 ? '<span class="card-badge out">Out of Stock</span>' : 
                  isNew ? '<span class="card-badge new">New</span>' : '';
    
    return `
        <article class="card">

    <div class="card-image-wrap">
        ${badge}
        <img src="${imageUrl}" alt="${product.name}" class="card-img" loading="lazy">
    </div>

    <div class="card-body">
        <p class="card-brand">${product.brand || 'Maison'}</p>
        <h3 class="card-title">${product.name}</h3>

        <div class="card-price-row">
            <span class="card-price">${formatPrice(product.price)}</span>
            <span class="card-stock ${product.stock > 0 ? 'in' : 'out'}">
                ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
        </div>

        <!-- ✅ HAPA CHINI NDIO BUTTONS -->
        <div class="card-actions-bottom">
            <a href="${getWhatsAppLink(product)}" target="_blank" class="card-btn card-btn-whatsapp">
                Order
            </a>

            <button class="card-btn card-btn-cart"
                    onclick="navigate('/product/${product.id}')">
                View Details →
            </button>
        </div>

    </div>

</article>
    `;
}

function renderProductGrid(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">◆</div>
                <h3>${t('no_products')}</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(renderProductCard).join('');
}

function showSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = createSkeleton(8);
}

function renderPagination(containerId) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) return;
    
    let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">← Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next →</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadProductsPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Pages ---
async function loadHomePage() {
    document.getElementById('app').innerHTML = `
        <div class="hero">
            <div class="hero-bg"></div>
            <div class="hero-content fade-up">
                <p class="hero-label">Curated Collection 2026</p>
                <h1>Timeless Design,<br>Modern Living</h1>
                <p>Discover our handpicked selection of premium products crafted for those who appreciate quality and aesthetics.</p>
                <a href="/products" class="hero-btn" onclick="navigate('/products'); return false;">
                    Explore Collection
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>
        <div class="container">
            <section class="section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title" data-i18n="featured">${t('featured')}</h2>
                        <p class="section-subtitle">Handpicked favorites this season</p>
                    </div>
                    <a href="/products?featured=true" class="view-all" onclick="navigate('/products?featured=true'); return false;">
                        View All
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                </div>
                <div id="featured-grid" class="grid">${createSkeleton(4)}</div>
            </section>
            <section class="section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title" data-i18n="newest">${t('newest')}</h2>
                        <p class="section-subtitle">Fresh arrivals just for you</p>
                    </div>
                    <a href="/products?sort=newest" class="view-all" onclick="navigate('/products?sort=newest'); return false;">
                        View All
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                </div>
                <div id="newest-grid" class="grid">${createSkeleton(4)}</div>
            </section>
        </div>
    `;
    
    const [featured, newest] = await Promise.all([
        fetchProducts({ featured: true }, 1),
        fetchProducts({ sort: 'newest' }, 1)
    ]);
    
    renderProductGrid(featured.slice(0, 4), 'featured-grid');
    renderProductGrid(newest.slice(0, 4), 'newest-grid');
}

async function loadProductsPage() {
    const filters = getFilters();
    const products = await fetchProducts(filters, currentPage);
    
    document.getElementById('app').innerHTML = `
        <div class="container" style="margin-top: 72px; padding-top: 3rem;">
            <div class="filters-bar">
                <div class="filter-group">
                    <label data-i18n="category">${t('category')}</label>
                    <select id="filter-category" onchange="updateFilters()">
                        <option value="">All Categories</option>
                        ${categories.map(c => `<option value="${c.id}" ${filters.category == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label data-i18n="brand">${t('brand')}</label>
                    <select id="filter-brand" onchange="updateFilters()">
                        <option value="">All Brands</option>
                        ${[...new Set(products.map(p => p.brand).filter(Boolean))].map(b => `<option value="${b}" ${filters.brand === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label data-i18n="availability">${t('availability')}</label>
                    <select id="filter-availability" onchange="updateFilters()">
                        <option value="">All</option>
                        <option value="in_stock" ${filters.availability === 'in_stock' ? 'selected' : ''}>In Stock</option>
                        <option value="out_of_stock" ${filters.availability === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Sort</label>
                    <select id="filter-sort" onchange="updateFilters()">
                        <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>Newest First</option>
                        <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>Oldest First</option>
                        <option value="price_asc" ${filters.sort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
                        <option value="price_desc" ${filters.sort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
                        <option value="name" ${filters.sort === 'name' ? 'selected' : ''}>Alphabetical</option>
                    </select>
                </div>
            </div>
            <div id="products-grid" class="grid">${createSkeleton(8)}</div>
            <div id="pagination"></div>
        </div>
    `;
    
    renderProductGrid(products, 'products-grid');
    renderPagination('pagination');
}

async function loadProductDetailPage(id) {
    showSkeleton('app');
    const product = await fetchProductById(id);
    if (!product) {
        document.getElementById('app').innerHTML = `
            <div class="container" style="margin-top: 72px; padding: 6rem 0;">
                <div class="empty-state">
                    <div class="empty-state-icon">◆</div>
                    <h3>Product Not Found</h3>
                    <p>The product you're looking for doesn't exist or has been removed.</p>
                </div>
            </div>`;
        return;
    }
    
    const related = await fetchRelatedProducts(product.category_id, product.id);
    const images = [product.main_image, ...(product.gallery_images || [])].filter(Boolean);
    const defaultImg = 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&h=1000&fit=crop';
    
    document.getElementById('app').innerHTML = `
        <div class="container">
            <div class="product-detail">
                <div>
                    <div class="gallery-main">
                        <img id="main-image" src="${images[0] || defaultImg}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='${defaultImg}'">
                    </div>
                    <div class="gallery-thumbs">
                        ${images.map((img, i) => `<img src="${img || defaultImg}" class="gallery-thumb ${i===0?'active':''}" onclick="setMainImage('${img || defaultImg}', this)" onerror="this.style.display='none'">`).join('')}
                    </div>
                </div>
                <div class="product-info">
                    <p class="product-brand">${product.brand || 'Maison'}</p>
                    <h1>${product.name}</h1>
                    <p class="product-sku">SKU: ${product.sku}</p>
                    <p class="price" data-price="${product.price}">${formatPrice(product.price)}</p>
                    <p class="product-description">${product.description || 'A carefully curated piece designed with attention to detail and quality craftsmanship.'}</p>
                    <div class="product-meta">
                        <div class="meta-item">
                            <dt>Category</dt>
                            <dd>${product.categories?.name || 'Uncategorized'}</dd>
                        </div>
                        <div class="meta-item">
                            <dt>Availability</dt>
                            <dd>${product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}</dd>
                        </div>
                    </div>
                    <div class="product-actions">
                        <a href="${getWhatsAppLink(product)}" target="_blank" rel="noopener" class="product-btn product-btn-whatsapp">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Order on WhatsApp
                        </a>
                        <button class="product-btn product-btn-secondary" onclick="shareProduct('${product.name}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            Share Product
                        </button>
                    </div>
                    <div class="product-share">
                        <button class="share-btn" onclick="copyLink()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>
            ${related.length > 0 ? `
            <section class="related-section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title" data-i18n="related_products">${t('related_products')}</h2>
                        <p class="section-subtitle">You might also like these</p>
                    </div>
                </div>
                <div class="grid">${related.map(renderProductCard).join('')}</div>
            </section>` : ''}
        </div>
    `;
}

async function loadCategoriesPage() {
    document.getElementById('app').innerHTML = `
        <div class="category-hero">
            <h1 data-i18n="categories">${t('categories')}</h1>
            <p>Browse our curated collections</p>
        </div>
        <div class="container">
            <section class="section">
                <div id="categories-grid" class="grid">${createSkeleton(4)}</div>
            </section>
        </div>
    `;
    
    const cats = await fetchCategories();
    const container = document.getElementById('categories-grid');
    if (cats.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-state-icon">◆</div>
                <h3>No categories yet</h3>
            </div>`;
        return;
    }
    
    container.innerHTML = cats.map(c => `
    <a href="/products?category=${c.id}" class="category-card" onclick="navigate('/products?category=${c.id}'); return false;">
            <div class="category-card-content">
                <h3>${c.name}</h3>
                <p>${c.description || 'Explore collection'}</p>
                <div class="cat-arrow">→</div>
            </div>
        </a>
    `).join('');
}

// --- Helpers ---
function setMainImage(src, thumb) {
    document.getElementById('main-image').src = src;
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function shareProduct(name) {
    if (navigator.share) {
        navigator.share({ title: name, url: window.location.href });
    } else {
        copyLink();
    }
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied to clipboard'));
}

function getFilters() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search') || '',
        category: params.get('category') || '',
        brand: params.get('brand') || '',
        availability: params.get('availability') || '',
        sort: params.get('sort') || 'newest',
        minPrice: params.get('minPrice') || '',
        maxPrice: params.get('maxPrice') || ''
    };
}

function updateFilters() {
    const params = new URLSearchParams();
    const category = document.getElementById('filter-category')?.value;
    const brand = document.getElementById('filter-brand')?.value;
    const availability = document.getElementById('filter-availability')?.value;
    const sort = document.getElementById('filter-sort')?.value;
    
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (availability) params.set('availability', availability);
    if (sort) params.set('sort', sort);
    
    navigate(`/products?${params.toString()}`);
}

function applySettings() {
    if (settings.primary_color) {
        document.documentElement.style.setProperty('--accent', settings.primary_color);
    }
    if (settings.company_name) {
        document.querySelectorAll('.logo-text').forEach(el => el.textContent = settings.company_name);
    }
    if (settings.footer_text) {
        const ft = document.getElementById('footer-text');
        if (ft) ft.textContent = settings.footer_text;
    }
    if (settings.whatsapp_number) {
        const wa = document.getElementById('whatsapp-float');
        if (wa) wa.href = `https://wa.me/${settings.whatsapp_number}`;
    }
}

// --- Search ---
const handleSearch = debounce(async (query) => {
    if (query.length < 2) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
}, 300);

// --- Routes ---
route('/', loadHomePage);
route('/products', loadProductsPage);
route('/categories', loadCategoriesPage);
route('/product/:id', (params) => loadProductDetailPage(params.id));

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchSettings();
    categories = await fetchCategories();
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
    
    router();
});
