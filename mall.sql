-- mall.sql

-- ==========================================
-- 1. ระบบกระเป๋าเงิน (User Wallets)
-- ใช้ user_id จาก ProjectRust โดยตรง ไม่มี Foreign Key
-- ==========================================
CREATE TABLE user_wallets (
    user_id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 1.5 ระบบ Roles และ ข้อมูลเสริม (Addresses, Shops, Centers, Riders)
-- ==========================================
CREATE TABLE user_roles (
    user_id VARCHAR(255) PRIMARY KEY,
    role VARCHAR(50) DEFAULT 'customer' -- roles: customer, owner, center, rider
);

CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(100), -- เช่น "บ้าน", "ที่ทำงาน"
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_centers (
    id SERIAL PRIMARY KEY,
    center_user_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address_id INT REFERENCES user_addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address_id INT REFERENCES user_addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE riders (
    id SERIAL PRIMARY KEY,
    rider_user_id VARCHAR(255) NOT NULL UNIQUE,
    center_id INT REFERENCES delivery_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. ระบบ E-commerce (Shopping Mall)
-- ==========================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    shop_id INT REFERENCES shops(id) ON DELETE CASCADE, -- ผูกสินค้ากับหน้าร้าน (Owner)
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    media_urls TEXT DEFAULT '[]'
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    shipping_method VARCHAR(50) DEFAULT 'standard',
    note TEXT,
    promo_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL
);

-- ระบบแยกย่อยการจัดส่งต่อร้านค้าในคำสั่งซื้อนั้น
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    shop_id INT REFERENCES shops(id) ON DELETE CASCADE,
    current_center_id INT REFERENCES delivery_centers(id) ON DELETE SET NULL,
    rider_id INT REFERENCES riders(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, shipped_to_center, at_center, delivering, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. ระบบ Content Management & Tracking
-- ==========================================
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carousels (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appeals (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    gallery_urls TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_tracking (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    status_detail TEXT NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_comments (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, order_id) 
);

-- ==========================================
-- 4. ข้อมูลตัวอย่างเบื้องต้น (Mock Data)
-- ==========================================
INSERT INTO categories (name) VALUES 
('Electronics'), 
('Clothing'), 
('Food & Beverage');

INSERT INTO news (title, content, image_url) VALUES 
('ยินดีต้อนรับสู่ระบบ Mall!', 'ระบบช้อปปิ้งออนไลน์เปิดให้บริการแล้ว พบกับสินค้ามากมาย พร้อมโปรโมชั่นพิเศษช่วงเปิดตัว', '');