-- =======================================================
--  UUIDv7 Generator Function
-- =======================================================
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  v_unix_t bigint;
  v_rand_a bigint;
  v_rand_b bigint;
  v_rand_c bigint;
BEGIN
  v_unix_t := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_rand_a := (random() * 4095)::bigint;
  v_rand_b := (random() * 4095)::bigint;
  v_rand_c := (random() * 281474976710655)::bigint;
  
  RETURN (
    lpad(to_hex(v_unix_t), 12, '0') ||
    '7' || lpad(to_hex(v_rand_a), 3, '0') ||
    to_hex(8 + (random() * 3)::int) || lpad(to_hex(v_rand_b), 3, '0') ||
    lpad(to_hex(v_rand_c), 12, '0')
  )::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- mall.sql

-- ==========================================
-- 1. ระบบกระเป๋าเงิน (User Wallets)
-- ==========================================
CREATE TABLE user_wallets (
    user_id UUID PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 1.5 ระบบ Roles และ ข้อมูลเสริม (Addresses, Shops, Centers, Riders)
-- ==========================================
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY,
    role VARCHAR(50) DEFAULT 'customer' 
);

CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL,
    title VARCHAR(100), 
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    center_user_id UUID NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address_id UUID REFERENCES user_addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT, -- คำอธิบายร้านค้า
    banner_url TEXT, -- รูปแบนเนอร์ตกแต่งร้าน
    address_id UUID REFERENCES user_addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    rider_user_id UUID NOT NULL UNIQUE,
    center_id UUID REFERENCES delivery_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. ระบบ E-commerce (Shopping Mall)
-- ==========================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE, 
    image_url TEXT,
    media_urls TEXT DEFAULT '[]',
    parent_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_type VARCHAR(100),
    variant_value VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    current_center_id UUID REFERENCES delivery_centers(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. ระบบ Content Management & Tracking
-- ==========================================
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carousels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL,
    topic VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    gallery_urls TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status_detail TEXT NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, order_id) 
);

-- ==========================================
-- 4. ระบบโปรโมชั่น (Promotions)
-- ==========================================
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) DEFAULT 'fixed',
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount DECIMAL(10, 2),
    min_purchase DECIMAL(10, 2) DEFAULT 0,
    usage_limit INT DEFAULT 0,
    used_count INT DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE, -- (เพิ่มใหม่) ล็อกร้านที่ใช้
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL,
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT FALSE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, promotion_id) 
);

INSERT INTO categories (name) VALUES 
('Electronics'), 
('Clothing'), 
('Food & Beverage');

INSERT INTO news (title, content, image_url) VALUES 
('ยินดีต้อนรับสู่ระบบ Mall!', 'ระบบช้อปปิ้งออนไลน์เปิดให้บริการแล้ว พบกับสินค้ามากมาย พร้อมโปรโมชั่นพิเศษช่วงเปิดตัว', '');