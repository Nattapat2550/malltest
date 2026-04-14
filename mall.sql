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
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    media_urls TEXT DEFAULT '[]'
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- อ้างอิง user_id จาก ProjectRust
    total_amount DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    shipping_method VARCHAR(50) DEFAULT 'standard',
    note TEXT,
    promo_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, shipped, completed, cancelled
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

-- ==========================================
-- 3. ระบบ Content Management (หน้าเว็บ & ข่าวสาร)
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
    user_id VARCHAR(255) NOT NULL, -- อ้างอิง user_id จาก ProjectRust
    topic VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    gallery_urls TEXT DEFAULT '[]', -- เก็บ Array เป็น JSON String
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_tracking (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    status_detail TEXT NOT NULL, -- เช่น "สินค้าถึงศูนย์คัดแยกบางพลี", "กำลังนำจ่าย"
    location VARCHAR(255),       -- สถานที่ (ถ้ามี)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_comments (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- อ้างอิง user_id จาก ProjectRust
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5), -- ให้คะแนน 1-5 ดาว
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- ป้องกันการคอมเมนต์ซ้ำ: 1 user สามารถคอมเมนต์สินค้านี้ได้ 1 ครั้ง ต่อ 1 คำสั่งซื้อ
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