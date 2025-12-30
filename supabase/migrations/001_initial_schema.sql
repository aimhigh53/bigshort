-- BigShort 경매 물건 필터링 시스템 DB 스키마
-- 2024-12-30

-- 경매 물건 테이블
CREATE TABLE IF NOT EXISTS auction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  case_number VARCHAR(50) NOT NULL UNIQUE,           -- 사건번호 (2024타경50737)
  court VARCHAR(50) NOT NULL,                         -- 담당법원
  property_type VARCHAR(20) NOT NULL DEFAULT 'APT',   -- 물건종류 (APT, OFFICETEL 등)

  -- 위치 정보
  address TEXT NOT NULL,                              -- 전체 주소
  sido VARCHAR(20) NOT NULL,                          -- 시도 (경기, 충남 등)
  sigungu VARCHAR(30) NOT NULL,                       -- 시군구
  dong VARCHAR(50),                                   -- 동/읍/면
  apartment_name VARCHAR(100),                        -- 아파트명
  dong_ho VARCHAR(50),                                -- 동/호수 (102동 14층)

  -- 면적 정보
  area_m2 DECIMAL(10, 2) NOT NULL,                    -- 전용면적 (㎡)
  area_py DECIMAL(10, 2) GENERATED ALWAYS AS (area_m2 / 3.3058) STORED,  -- 평수 자동계산

  -- 가격 정보
  appraisal_price BIGINT NOT NULL,                    -- 감정가
  minimum_price BIGINT NOT NULL,                      -- 최저가
  deposit BIGINT,                                     -- 보증금 (있는 경우)

  -- 입찰 정보
  fail_count INTEGER NOT NULL DEFAULT 0,              -- 유찰횟수
  auction_date DATE,                                  -- 매각기일

  -- 계산된 필드
  discount_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    ROUND(((appraisal_price - minimum_price)::DECIMAL / appraisal_price) * 100, 2)
  ) STORED,                                           -- 할인율 자동계산

  -- 권리 분석
  is_safe BOOLEAN NOT NULL DEFAULT false,             -- 인수사항 없음 여부
  rights_analysis TEXT,                               -- 권리분석 내용
  risk_items TEXT[],                                  -- 위험요소 배열

  -- 메타데이터
  source_url TEXT,                                    -- 원본 URL (하옥션)
  image_urls TEXT[],                                  -- 물건 이미지 URLs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 실거래가 정보 테이블
CREATE TABLE IF NOT EXISTS real_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 위치 정보
  sido VARCHAR(20) NOT NULL,
  sigungu VARCHAR(30) NOT NULL,
  dong VARCHAR(50),
  apartment_name VARCHAR(100) NOT NULL,

  -- 거래 정보
  deal_year INTEGER NOT NULL,
  deal_month INTEGER NOT NULL,
  deal_price BIGINT NOT NULL,                         -- 거래가 (만원 단위)
  area_m2 DECIMAL(10, 2) NOT NULL,
  floor INTEGER,

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 회전율 계산 테이블 (물건별 캐싱)
CREATE TABLE IF NOT EXISTS turnover_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_item_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,

  -- 회전율 정보
  turnover_rate DECIMAL(5, 2) NOT NULL,               -- 회전율 (%)
  avg_deal_price BIGINT,                              -- 평균 거래가
  deal_count INTEGER,                                 -- 거래 건수
  calculation_period VARCHAR(20),                     -- 계산 기간 (최근 12개월 등)

  -- 메타데이터
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용자 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                              -- Supabase Auth user ID
  auction_item_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,

  notes TEXT,                                         -- 메모
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, auction_item_id)
);

-- 크롤링 로그 테이블
CREATE TABLE IF NOT EXISTS crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  crawl_type VARCHAR(20) NOT NULL,                    -- 크롤링 타입 (hauction, molit)
  status VARCHAR(20) NOT NULL,                        -- 상태 (success, failed, running)
  items_count INTEGER,                                -- 수집된 물건 수
  error_message TEXT,                                 -- 에러 메시지

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_auction_items_sido ON auction_items(sido);
CREATE INDEX IF NOT EXISTS idx_auction_items_sigungu ON auction_items(sigungu);
CREATE INDEX IF NOT EXISTS idx_auction_items_property_type ON auction_items(property_type);
CREATE INDEX IF NOT EXISTS idx_auction_items_fail_count ON auction_items(fail_count);
CREATE INDEX IF NOT EXISTS idx_auction_items_minimum_price ON auction_items(minimum_price);
CREATE INDEX IF NOT EXISTS idx_auction_items_is_safe ON auction_items(is_safe);
CREATE INDEX IF NOT EXISTS idx_auction_items_auction_date ON auction_items(auction_date);
CREATE INDEX IF NOT EXISTS idx_auction_items_case_number ON auction_items(case_number);

CREATE INDEX IF NOT EXISTS idx_real_prices_location ON real_prices(sido, sigungu, apartment_name);
CREATE INDEX IF NOT EXISTS idx_real_prices_deal_date ON real_prices(deal_year, deal_month);

CREATE INDEX IF NOT EXISTS idx_turnover_rates_auction_item ON turnover_rates(auction_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- Updated at 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auction_items_updated_at
  BEFORE UPDATE ON auction_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 필터링을 위한 뷰 생성
CREATE OR REPLACE VIEW filtered_auction_items AS
SELECT
  ai.*,
  tr.turnover_rate,
  tr.avg_deal_price,
  tr.deal_count,
  -- 실투자금 계산 (최저가 * 0.2 + 취등록세 1.3% + 기타비용 300만원)
  ROUND(ai.minimum_price * 0.2 + ai.minimum_price * 0.013 + 3000000) AS required_investment
FROM auction_items ai
LEFT JOIN turnover_rates tr ON ai.id = tr.auction_item_id;

-- Row Level Security (RLS) 설정
ALTER TABLE auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Public read access for auction items
CREATE POLICY "Anyone can view auction items" ON auction_items
  FOR SELECT USING (true);

-- Users can manage their own favorites
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);
