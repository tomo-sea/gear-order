-- [1] 현재 창고 실재고를 시스템에 일괄 반영 (사진 데이터 기준)
-- 블랙
UPDATE public.kr_inventory SET available_qty = 48 WHERE product_desc = 'XT핀 - 블랙 L';
UPDATE public.kr_inventory SET available_qty = 88 WHERE product_desc = 'XT핀 - 블랙 M';
UPDATE public.kr_inventory SET available_qty = 38 WHERE product_desc = 'XT핀 - 블랙 S';
-- 블루
UPDATE public.kr_inventory SET available_qty = 15 WHERE product_desc = 'XT핀 - 블루 L';
UPDATE public.kr_inventory SET available_qty = 30 WHERE product_desc = 'XT핀 - 블루 M';
UPDATE public.kr_inventory SET available_qty = 20 WHERE product_desc = 'XT핀 - 블루 S';
UPDATE public.kr_inventory SET available_qty = 2 WHERE product_desc = 'XT핀 - 블루 XL';
-- 레드
UPDATE public.kr_inventory SET available_qty = 10 WHERE product_desc = 'XT핀 - 레드 L';
UPDATE public.kr_inventory SET available_qty = 20 WHERE product_desc = 'XT핀 - 레드 M';
UPDATE public.kr_inventory SET available_qty = 19 WHERE product_desc = 'XT핀 - 레드 S';
-- 그린
UPDATE public.kr_inventory SET available_qty = 19 WHERE product_desc = 'XT핀 - 그린 L';
UPDATE public.kr_inventory SET available_qty = 30 WHERE product_desc = 'XT핀 - 그린 M';
UPDATE public.kr_inventory SET available_qty = 15 WHERE product_desc = 'XT핀 - 그린 S';
UPDATE public.kr_inventory SET available_qty = 3 WHERE product_desc = 'XT핀 - 그린 XL';
-- 화이트
UPDATE public.kr_inventory SET available_qty = 28 WHERE product_desc = 'XT핀 - 화이트 L';
UPDATE public.kr_inventory SET available_qty = 63 WHERE product_desc = 'XT핀 - 화이트 M';
UPDATE public.kr_inventory SET available_qty = 34 WHERE product_desc = 'XT핀 - 화이트 S';
UPDATE public.kr_inventory SET available_qty = 5 WHERE product_desc = 'XT핀 - 화이트 XL';

-- [2] 운영 설정 테이블 생성 (실재고 점검일 등 저장용)
CREATE TABLE IF NOT EXISTS public.kr_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 초기 데이터 삽입 (오늘을 마지막 점검일로 설정)
INSERT INTO public.kr_settings (key, value)
VALUES ('last_stock_check_at', '"2026-04-06T00:00:00Z"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
