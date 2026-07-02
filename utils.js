// ==========================================
// Maison Core Utilities
// Supabase, i18n, Currency, Theme, Image Compression
// ==========================================

// --- Supabase Client ---
const SUPABASE_URL = 'https://oktsgiktgzvuhdpuibgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdHNnaWt0Z3p2dWhkcHVpYmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA2ODksImV4cCI6MjA5ODUwNjY4OX0.e76sUBaqI7rGA9rXAJRR3SsKpmyoqCrL75bKPbssmJQ';
let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error('Supabase library not loaded');
    }
    return supabaseClient;
}

// --- Localization (i18n) ---
const translations = {
    en: {
        home: "Home", categories: "Categories", products: "Shop", search: "Search products, brands, categories...",
        featured: "Featured Products", newest: "Newest Products", view_details: "View Details",
        add_to_cart: "Order via WhatsApp", out_of_stock: "Out of Stock", in_stock: "In Stock",
        related_products: "Related Products", share: "Share", copy_link: "Copy Link",
        price_low_high: "Price: Low to High", price_high_low: "Price: High to Low",
        alphabetical: "Alphabetical", newest_first: "Newest First", oldest_first: "Oldest First",
        filter_by: "Filter By", category: "Category", brand: "Brand", availability: "Availability",
        admin_login: "Admin Login", dashboard: "Dashboard", total_products: "Total Products",
        total_categories: "Total Categories", low_stock: "Low Stock", settings: "Settings",
        save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add",
        product_name: "Product Name", description: "Description", price: "Price",
        sku: "SKU", stock: "Stock", featured_product: "Featured Product", hidden: "Hidden",
        drag_drop: "Drag & Drop images here", upload_images: "Upload Images",
        store_info: "Store Information", whatsapp_number: "WhatsApp Number", company_name: "Company Name",
        primary_color: "Primary Color", footer_text: "Footer Text", language: "Language",
        currency: "Currency", theme: "Theme", light: "Light", dark: "Dark",
        no_products: "No products found.", loading: "Loading...", error: "Something went wrong."
    },
    sw: {
        home: "Nyumbani", categories: "Kategoria", products: "Duka", search: "Tafuta bidhaa, brandi...",
        featured: "Bidhaa Maalum", newest: "Bidhaa Mpya", view_details: "Tazama Maelezo",
        add_to_cart: "Agiza kupitia WhatsApp", out_of_stock: "Hakuna Stock", in_stock: "Ipo Stock",
        related_products: "Bidhaa Zinazohusiana", share: "Shiriki", copy_link: "Nakili Kiungo",
        price_low_high: "Bei: Chini hadi Juu", price_high_low: "Bei: Juu hadi Chini",
        alphabetical: "Alfabeti", newest_first: "Mpya Kwanza", oldest_first: "Zamani Kwanza",
        filter_by: "Chuja Kwa", category: "Kategoria", brand: "Brandi", availability: "Upatikanaji",
        admin_login: "Ingia kwa Admin", dashboard: "Dashibodi", total_products: "Jumla ya Bidhaa",
        total_categories: "Jumla ya Kategoria", low_stock: "Stock Chini", settings: "Mipangilio",
        save: "Hifadhi", cancel: "Ghairi", delete: "Futa", edit: "Hariri", add: "Ongeza",
        product_name: "Jina la Bidhaa", description: "Maelezo", price: "Bei",
        sku: "SKU", stock: "Stock", featured_product: "Bidhaa Maalum", hidden: "Imefichwa",
        drag_drop: "Buruta & Acha picha hapa", upload_images: "Pakia Picha",
        store_info: "Taarifa ya Duka", whatsapp_number: "Namba ya WhatsApp", company_name: "Jina la Kampuni",
        primary_color: "Rangi Kuu", footer_text: "Maandishi ya Kijachini", language: "Lugha",
        currency: "Sarafu", theme: "Mandhari", light: "Nuru", dark: "Giza",
        no_products: "Hakuna bidhaa zilizopatikana.", loading: "Inapakia...", error: "Kuna hitilafu imetokea."
    }
};

let currentLang = localStorage.getItem('lang') || 'en';
let currentCurrency = localStorage.getItem('currency') || 'USD';
let currentTheme = localStorage.getItem('theme') || 'light';

function t(key) {
    return translations[currentLang][key] || key;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    updateTextContent();
}

function setCurrency(curr) {
    currentCurrency = curr;
    localStorage.setItem('currency', curr);
    updatePrices();
}

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    document.body.setAttribute('data-theme', theme);
}

function formatPrice(price) {
    // price stored in database is TZS
    if (currentCurrency === 'USD') {
        return `$${(price / 2500).toFixed(2)}`;
    }
    return `TSh ${Number(price).toLocaleString()}`;
}

function updateTextContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
}

function updatePrices() {
    document.querySelectorAll('[data-price]').forEach(el => {
        el.textContent = formatPrice(parseFloat(el.getAttribute('data-price')));
    });
}

// --- Image Compression ---
async function compressImage(file, maxWidth = 1200, maxSizeKB = 250) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                let quality = 0.9;
                const tryCompress = () => {
                    canvas.toBlob((blob) => {
                        if (blob.size > maxSizeKB * 1024 && quality > 0.1) {
                            quality -= 0.1;
                            tryCompress();
                        } else {
                            resolve(new File([blob], file.name.replace(/\\.[^/.]+$/, ".webp"), { type: 'image/webp' }));
                        }
                    }, 'image/webp', quality);
                };
                tryCompress();
            };
        };
    });
}

// --- Debounce ---
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// --- Toast Notification ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Skeleton Loader ---
function createSkeleton(count = 4) {
    return Array(count).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-text title"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');
}

// --- Router ---
const routes = {};
function route(path, handler) { routes[path] = handler; }
function navigate(path) {
    window.history.pushState({}, '', path);
    router();
}
function router() {
    const path = window.location.pathname;

    // Exact route
    if (routes[path]) {
        return routes[path]();
    }

    // Dynamic routes like /product/:id
    for (const routePath in routes) {
        if (!routePath.includes(':')) continue;

        const routeParts = routePath.split('/');
        const pathParts = path.split('/');

        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        let match = true;

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].slice(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                match = false;
                break;
            }
        }

        if (match) {
            return routes[routePath](params);
        }
    }

    // Fallback
    if (routes['/']) {
        routes['/']();
    }
}

window.addEventListener('popstate', router);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setTheme(currentTheme);
    setLang(currentLang);
    initSupabase();
});
