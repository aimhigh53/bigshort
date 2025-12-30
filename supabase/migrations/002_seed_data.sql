-- 테스트용 시드 데이터
-- 실제 데이터는 하옥션 크롤링으로 수집

INSERT INTO auction_items (
  case_number, court, property_type,
  address, sido, sigungu, dong, apartment_name, dong_ho,
  area_m2, appraisal_price, minimum_price,
  fail_count, auction_date, is_safe, rights_analysis, source_url
) VALUES
-- 충남 천안시 불당 아이파크
(
  '2024타경50737', '대전지방법원 천안지원', 'APT',
  '충청남도 천안시 서북구 불당동 1234', '충남', '천안시', '불당동', '불당 아이파크', '102동 14층',
  84.92, 500000000, 240000000,
  2, '2025-01-15', true, '인수사항 없음. 권리분석 완료.', 'https://www.hauction.co.kr/item/1'
),
-- 강원 춘천시 그린타운
(
  '2024타경61245', '춘천지방법원', 'APT',
  '강원도 춘천시 퇴계동 567', '강원', '춘천시', '퇴계동', '그린타운', '102동 4층',
  118.5, 320000000, 156800000,
  2, '2025-01-20', true, '인수사항 없음.', 'https://www.hauction.co.kr/item/2'
),
-- 경기 평택시 세교 푸르지오
(
  '2024타경52881', '수원지방법원 평택지원', 'APT',
  '경기도 평택시 세교동 890', '경기', '평택시', '세교동', '세교 푸르지오', '205동 8층',
  74.5, 380000000, 195200000,
  1, '2025-01-18', true, '인수사항 없음.', 'https://www.hauction.co.kr/item/3'
),
-- 경남 김해시 힐스테이트
(
  '2024타경49203', '창원지방법원', 'APT',
  '경상남도 김해시 내동 123', '경남', '김해시', '내동', '김해 힐스테이트', '107동 12층',
  99.2, 420000000, 218400000,
  1, '2025-01-22', true, '인수사항 없음.', 'https://www.hauction.co.kr/item/4'
),
-- 전북 전주시 에코시티
(
  '2024타경55892', '전주지방법원', 'APT',
  '전라북도 전주시 덕진구 팔복동 456', '전북', '전주시', '팔복동', '에코시티 더샵', '103동 6층',
  85.0, 350000000, 196000000,
  1, '2025-01-25', true, '인수사항 없음.', 'https://www.hauction.co.kr/item/5'
),
-- 충북 청주시 가경동 아파트 (위험물건 - 테스트용)
(
  '2024타경58123', '청주지방법원', 'APT',
  '충청북도 청주시 흥덕구 가경동 789', '충북', '청주시', '가경동', '가경 센트럴자이', '201동 10층',
  110.0, 480000000, 268800000,
  2, '2025-01-28', false, '선순위 임차인 존재. 대항력 있는 임차보증금 8천만원.', 'https://www.hauction.co.kr/item/6'
);

-- 회전율 데이터 (테스트용)
INSERT INTO turnover_rates (auction_item_id, turnover_rate, avg_deal_price, deal_count, calculation_period)
SELECT id, 4.1, 520000000, 48, '최근 12개월' FROM auction_items WHERE case_number = '2024타경50737'
UNION ALL
SELECT id, 5.2, 340000000, 62, '최근 12개월' FROM auction_items WHERE case_number = '2024타경61245'
UNION ALL
SELECT id, 4.8, 400000000, 55, '최근 12개월' FROM auction_items WHERE case_number = '2024타경52881'
UNION ALL
SELECT id, 3.9, 450000000, 41, '최근 12개월' FROM auction_items WHERE case_number = '2024타경49203'
UNION ALL
SELECT id, 6.1, 360000000, 73, '최근 12개월' FROM auction_items WHERE case_number = '2024타경55892'
UNION ALL
SELECT id, 2.5, 510000000, 28, '최근 12개월' FROM auction_items WHERE case_number = '2024타경58123';
