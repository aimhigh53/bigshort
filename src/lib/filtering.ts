/**
 * BigShort 6단계 필터링 로직
 *
 * 1. 기본 타겟팅: 지방 대형 아파트
 * 2. 입찰 차수: 신건~3회 유찰
 * 3. 유동성: 거래 회전율 3% 이상
 * 4. 실투자금: 5000만원 이하
 * 5. 권리 안전: 인수사항 없음
 * 6. 특수물건 배제: 지분, 토지별도등기 제외
 */

import type { FilteredAuctionItem } from './supabase'

// 서울/수도권 지역 코드 (제외 대상)
const METRO_AREAS = ['서울', '경기', '인천']

// 특수물건 키워드 (제외 대상)
const SPECIAL_PROPERTY_KEYWORDS = [
  '지분',
  '토지별도등기',
  '구분지상권',
  '법정지상권',
  '분묘기지권',
  '유치권',
  '저당',
  '가처분',
]

// 위험 권리 키워드
const RISK_KEYWORDS = [
  '선순위',
  '대항력',
  '인수',
  '임차인',
  '최우선변제권',
  '소액임차인',
]

export interface FilterOptions {
  // 1. 기본 타겟팅
  propertyType: string          // APT, OFFICETEL
  minAreaM2: number             // 최소 면적 (㎡)
  excludeMetroAreas: boolean    // 수도권 제외

  // 2. 입찰 차수
  failCountMin: number          // 최소 유찰 횟수
  failCountMax: number          // 최대 유찰 횟수

  // 3. 유동성
  minTurnoverRate: number       // 최소 회전율 (%)

  // 4. 실투자금
  maxInvestment: number         // 최대 실투자금 (원)

  // 5. 권리 안전
  safeOnly: boolean             // 인수사항 없는 물건만

  // 6. 특수물건 배제
  excludeSpecialProperties: boolean
}

// 기본 필터 옵션 (PDF 스펙 기준)
export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  propertyType: 'APT',
  minAreaM2: 59,
  excludeMetroAreas: true,
  failCountMin: 0,
  failCountMax: 3,
  minTurnoverRate: 3.0,
  maxInvestment: 50000000,
  safeOnly: true,
  excludeSpecialProperties: true,
}

/**
 * 실투자금 계산
 * = 최저가 × 20% (보증금+잔금) + 취등록세 1.3% + 기타비용 300만원
 */
export function calculateRequiredInvestment(minimumPrice: number): number {
  const depositAndBalance = minimumPrice * 0.2
  const acquisitionTax = minimumPrice * 0.013
  const miscCost = 3000000
  return Math.round(depositAndBalance + acquisitionTax + miscCost)
}

/**
 * 1단계: 기본 타겟팅 필터
 * - 지방 대형 아파트 (서울/경기/인천 제외)
 * - 전용면적 59㎡ 이상
 */
export function filterBasicTarget(
  items: FilteredAuctionItem[],
  options: FilterOptions
): FilteredAuctionItem[] {
  return items.filter(item => {
    // 물건 종류 체크
    if (item.property_type !== options.propertyType) return false

    // 면적 체크
    if (item.area_m2 < options.minAreaM2) return false

    // 수도권 제외
    if (options.excludeMetroAreas && METRO_AREAS.includes(item.sido)) {
      return false
    }

    return true
  })
}

/**
 * 2단계: 입찰 차수 필터
 * - 신건 ~ 3회 유찰
 */
export function filterFailCount(
  items: FilteredAuctionItem[],
  options: FilterOptions
): FilteredAuctionItem[] {
  return items.filter(item => {
    return item.fail_count >= options.failCountMin &&
           item.fail_count <= options.failCountMax
  })
}

/**
 * 3단계: 유동성 필터
 * - 거래 회전율 3% 이상
 */
export function filterTurnoverRate(
  items: FilteredAuctionItem[],
  options: FilterOptions
): FilteredAuctionItem[] {
  return items.filter(item => {
    // 회전율 데이터가 없으면 통과 (데이터 부족)
    if (item.turnover_rate === null || item.turnover_rate === undefined) {
      return true
    }
    return item.turnover_rate >= options.minTurnoverRate
  })
}

/**
 * 4단계: 실투자금 필터
 * - 최저가 기준 5000만원 이하
 */
export function filterInvestment(
  items: FilteredAuctionItem[],
  options: FilterOptions
): FilteredAuctionItem[] {
  return items.filter(item => {
    const requiredInvestment = item.required_investment ||
      calculateRequiredInvestment(item.minimum_price)
    return requiredInvestment <= options.maxInvestment
  })
}

/**
 * 5단계: 권리 안전 필터
 * - 인수사항 없는 물건만
 */
export function filterRightsSafety(
  items: FilteredAuctionItem[],
  options: FilterOptions
): FilteredAuctionItem[] {
  if (!options.safeOnly) return items

  return items.filter(item => {
    // is_safe 필드 체크
    if (!item.is_safe) return false

    // 권리분석 내용에서 위험 키워드 체크
    if (item.rights_analysis) {
      for (const keyword of RISK_KEYWORDS) {
        if (item.rights_analysis.includes(keyword)) {
          return false
        }
      }
    }

    return true
  })
}

/**
 * 6단계: 특수물건 배제
 * - 지분매각, 토지별도등기 등 제외
 */
export function filterSpecialProperties(
  items: FilteredAuctionItem[],
  options: FilterOptions
): FilteredAuctionItem[] {
  if (!options.excludeSpecialProperties) return items

  return items.filter(item => {
    // 주소나 권리분석에서 특수물건 키워드 체크
    const searchText = `${item.address || ''} ${item.rights_analysis || ''}`

    for (const keyword of SPECIAL_PROPERTY_KEYWORDS) {
      if (searchText.includes(keyword)) {
        return false
      }
    }

    return true
  })
}

/**
 * 6단계 필터링 파이프라인 실행
 */
export function applyAllFilters(
  items: FilteredAuctionItem[],
  options: Partial<FilterOptions> = {}
): FilteredAuctionItem[] {
  const fullOptions = { ...DEFAULT_FILTER_OPTIONS, ...options }

  let filtered = items

  // 1단계: 기본 타겟팅
  filtered = filterBasicTarget(filtered, fullOptions)
  console.log(`1단계 (기본타겟팅): ${filtered.length}건`)

  // 2단계: 입찰 차수
  filtered = filterFailCount(filtered, fullOptions)
  console.log(`2단계 (입찰차수): ${filtered.length}건`)

  // 3단계: 유동성
  filtered = filterTurnoverRate(filtered, fullOptions)
  console.log(`3단계 (유동성): ${filtered.length}건`)

  // 4단계: 실투자금
  filtered = filterInvestment(filtered, fullOptions)
  console.log(`4단계 (실투자금): ${filtered.length}건`)

  // 5단계: 권리 안전
  filtered = filterRightsSafety(filtered, fullOptions)
  console.log(`5단계 (권리안전): ${filtered.length}건`)

  // 6단계: 특수물건 배제
  filtered = filterSpecialProperties(filtered, fullOptions)
  console.log(`6단계 (특수배제): ${filtered.length}건`)

  return filtered
}

/**
 * 필터 결과 통계
 */
export function getFilterStats(items: FilteredAuctionItem[]) {
  if (items.length === 0) {
    return {
      count: 0,
      avgDiscount: 0,
      avgInvestment: 0,
      avgTurnoverRate: 0,
      regionBreakdown: {},
    }
  }

  const avgDiscount = items.reduce((sum, item) =>
    sum + (item.discount_rate || 0), 0) / items.length

  const avgInvestment = items.reduce((sum, item) =>
    sum + (item.required_investment || calculateRequiredInvestment(item.minimum_price)), 0
  ) / items.length

  const validTurnoverItems = items.filter(item => item.turnover_rate !== null)
  const avgTurnoverRate = validTurnoverItems.length > 0
    ? validTurnoverItems.reduce((sum, item) => sum + (item.turnover_rate || 0), 0) / validTurnoverItems.length
    : 0

  // 지역별 분포
  const regionBreakdown: Record<string, number> = {}
  for (const item of items) {
    const region = item.sido
    regionBreakdown[region] = (regionBreakdown[region] || 0) + 1
  }

  return {
    count: items.length,
    avgDiscount: Math.round(avgDiscount * 10) / 10,
    avgInvestment: Math.round(avgInvestment),
    avgTurnoverRate: Math.round(avgTurnoverRate * 10) / 10,
    regionBreakdown,
  }
}
