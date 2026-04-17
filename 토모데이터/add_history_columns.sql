-- 판매대장 히스토리 추적용 컬럼 추가
-- 이 SQL을 Supabase SQL Editor에서 실행해주세요.

ALTER TABLE public.kr_quotes 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tax_issued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT now();

-- 인덱스 추가 (조회 속도 최적화)
CREATE INDEX IF NOT EXISTS idx_quotes_ordering ON public.kr_quotes (order_date DESC, created_at DESC);
