-- ==========================================
-- E-Commerce Database Schema
-- Supabase PostgreSQL with Row Level Security
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Categories Table
-- ==========================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_name ON categories(name);

-- ==========================================
-- Products Table
-- ==========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand TEXT,
    sku TEXT UNIQUE NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    featured BOOLEAN DEFAULT FALSE,
    hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    main_image TEXT,
    gallery_images TEXT[] DEFAULT '{}'
);

-- Indexes for performance (supports 10,000+ products)
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = TRUE;
CREATE INDEX idx_products_hidden ON products(hidden) WHERE hidden = FALSE;
CREATE INDEX idx_products_created ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_sku ON products(sku);

-- Full-text search index for instant search
CREATE INDEX idx_products_search ON products USING gin(
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(description,''))
);

-- ==========================================
-- Settings Table
-- ==========================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT DEFAULT 'Shop',
    whatsapp_number TEXT,
    primary_color TEXT DEFAULT '#4f46e5',
    footer_text TEXT DEFAULT '© 2026 Shop. All rights reserved.',
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (company_name, whatsapp_number, primary_color, footer_text) 
VALUES ('Shop', '255000000000', '#4f46e5', '© 2026 Shop. All rights reserved.')
ON CONFLICT DO NOTHING;

-- ==========================================
-- Row Level Security (RLS) Policies - Database Tables
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Products: Public can read non-hidden products
CREATE POLICY "Public read products" ON products
    FOR SELECT USING (hidden = FALSE);

-- Products: Only authenticated admins can write
CREATE POLICY "Admin write products" ON products
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Categories: Public read
CREATE POLICY "Public read categories" ON categories
    FOR SELECT USING (true);

-- Categories: Admin write
CREATE POLICY "Admin write categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Settings: Public read
CREATE POLICY "Public read settings" ON settings
    FOR SELECT USING (true);

-- Settings: Admin write
CREATE POLICY "Admin write settings" ON settings
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- Storage RLS Policies (Run after creating bucket)
-- ==========================================
-- NOTE: Create a public bucket named 'products' in Supabase Dashboard first
-- Then run these policies in the SQL Editor:

-- Allow public read access to product images
-- CREATE POLICY "Public read product images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'products');

-- Allow authenticated users to upload to products bucket
-- CREATE POLICY "Authenticated uploads to products"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'products');

-- Allow authenticated users to update/delete their uploads
-- CREATE POLICY "Authenticated update products"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'products');

-- CREATE POLICY "Authenticated delete products"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'products');

-- ==========================================
-- Supabase Auth Setup Instructions
-- ==========================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Invite admin user(s) via email
-- 3. Only invited users can access admin panel
-- 4. Enable Email provider in Auth Settings
-- 5. (Recommended) Disable public signups to prevent unauthorized access
-- 6. Create Storage bucket 'products' and set to public
-- 7. Apply Storage RLS policies above