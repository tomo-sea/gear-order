-- 0. 확장기능 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. 기존 테이블 삭제 (종속성 때문에 quotes 먼저 삭제)
DROP TABLE IF EXISTS public.kr_quotes;
DROP TABLE IF EXISTS public.kr_customers;

-- 2. 통합 거래처 마스터 테이블 생성 (신규 사양 반영)
CREATE TABLE public.kr_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_tier TEXT NOT NULL,      -- 딜러티어
    company_name TEXT NOT NULL,    -- 회 사 명
    manager_name TEXT,             -- 담 당 자
    phone TEXT,                    -- 연 락 처
    email TEXT,                    -- 이 메 일
    address TEXT,                  -- 주 소
    biz_number TEXT,               -- 사업자등록번호
    biz_name TEXT,                 -- 상호
    ceo_name TEXT,                 -- 대 표
    tax_email TEXT,                -- 세금용이메일
    instructor_rank TEXT,          -- 강사등급
    notes TEXT,                    -- 비고1
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 주문 내역 테이블 생성
CREATE TABLE public.kr_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.kr_customers(id) ON DELETE SET NULL,
    serial_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount NUMERIC NOT NULL,
    shipping_fee NUMERIC DEFAULT 5000,
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    order_note TEXT,
    status TEXT DEFAULT 'issued',
    is_tax_issued BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 추가 (검색 속도 향상)
CREATE INDEX IF NOT EXISTS idx_customers_company ON public.kr_customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_biz_name ON public.kr_customers(biz_name);
