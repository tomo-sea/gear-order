-- kr_customers table
CREATE TABLE IF NOT EXISTS public.kr_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_tier TEXT NOT NULL, -- '강사', '공급파트너', '다이빙센터'
    company_name TEXT NOT NULL,
    ceo_name TEXT,
    manager_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    biz_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- kr_quotes table (주문/판매 관리)
CREATE TABLE IF NOT EXISTS public.kr_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.kr_customers(id) ON DELETE SET NULL,
    serial_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]', -- [{color, size, quantity, price}, ...]
    total_amount NUMERIC NOT NULL,
    shipping_fee NUMERIC DEFAULT 5000,
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    order_note TEXT,
    status TEXT DEFAULT 'issued', -- issued, paid, shipped, delivered, cancelled
    is_tax_issued BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
