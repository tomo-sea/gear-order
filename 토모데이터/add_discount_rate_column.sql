-- 1. kr_quotes 테이블에 할인율(discount_rate) 컬럼 추가
ALTER TABLE public.kr_quotes ADD COLUMN IF NOT EXISTS discount_rate NUMERIC;

-- 2. 기존 데이터에 대해 기본값 0 또는 35 설정 (필요시)
-- UPDATE public.kr_quotes SET discount_rate = 35 WHERE discount_rate IS NULL;

-- 3. 검색 및 정렬 속도 향상을 위한 인덱스 (옵션)
CREATE INDEX IF NOT EXISTS idx_kr_quotes_discount_rate ON public.kr_quotes(discount_rate);
