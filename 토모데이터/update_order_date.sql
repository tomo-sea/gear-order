# 데이터베이스 마이그레이션 SQL

-- 1. kr_quotes 테이블에 실제 주문일(order_date) 컬럼 추가
ALTER TABLE kr_quotes ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT now();

-- 2. 기존 데이터의 주문일을 생성일로 복사하여 정합성 유지
UPDATE kr_quotes SET order_date = created_at WHERE order_date IS NULL;

-- 3. (옵션) 수정을 용이하게 하기 위해 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_kr_quotes_order_date ON kr_quotes(order_date DESC);
