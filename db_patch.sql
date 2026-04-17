-- [정상화 패치] 과거 잘못된 정가(252,000원)로 기록된 데이터를 380,000원 기준으로 복구합니다.
-- 실행 전 주의: 데이터의 총액(total_amount)이 변경되므로, 이미 정산이 완료된 내역인지 확인 후 실행하세요.

BEGIN;

-- 1. 배송비가 0원이거나 누락된 건을 기본 5,000원으로 보정 (제주도는 8,000원)
UPDATE kr_quotes
SET shipping_fee = CASE 
    WHEN shipping_address LIKE '%제주%' THEN 8000 
    ELSE 5000 
END
WHERE shipping_fee IS NULL OR shipping_fee = 0;

-- 2. items 내의 하드코딩된 단가(252,000원 등)를 380,000원 기준 할인 단가로 교체하고 총액 재계산
-- 참고: PostgreSQL의 jsonb 기능을 사용하여 내부 데이터를 업데이트합니다.
UPDATE kr_quotes
SET 
    -- 38만원 기준 할인 단가 계산 (discount_rate가 없을 경우 기본 30% 적용)
    items = (
        SELECT jsonb_agg(
            item || jsonb_build_object(
                'unitPrice', FLOOR(380000 * (1 - COALESCE(discount_rate, 30)::float / 100))
            )
        )
        FROM jsonb_array_elements(items) AS item
    ),
    -- 총액(total_amount) = (38만원 기준 할인 단가 * 수량)의 합 + 배송비
    total_amount = (
        SELECT SUM(FLOOR(380000 * (1 - COALESCE(discount_rate, 30)::float / 100)) * (item->>'quantity')::int)
        FROM jsonb_array_elements(items) AS item
    ) + (CASE WHEN shipping_address LIKE '%제주%' THEN 8000 ELSE 5000 END)
WHERE 
    -- 단가가 252,000원 계열로 잘못 들어갔을 것으로 추정되는 데이터들 필터링
    -- (정가 38만원 기준으로 할인된 단가들과 확연히 차이나는 경우)
    total_amount < 300000; -- 예: 1개 주문 시 252,000원이었던 데이터들을 주로 타겟팅

COMMIT;

-- [확인 쿼리] 업데이트된 데이터 확인
-- SELECT serial_number, total_amount, items FROM kr_quotes ORDER BY created_at DESC LIMIT 10;
