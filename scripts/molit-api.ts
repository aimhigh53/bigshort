/**
 * 국토부 아파트 실거래가 API 연동
 * 거래 회전율 계산을 위한 실거래 데이터 수집
 *
 * API: 국토교통부_아파트매매 실거래 상세 자료
 * https://www.data.go.kr/data/15057511/openapi.do
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MOLIT_API_KEY = process.env.MOLIT_API_KEY
const MOLIT_BASE_URL = 'http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// 법정동 코드 (지방 주요 도시)
const REGION_CODES: Record<string, string> = {
  // 충남
  '천안시': '44131',
  '아산시': '44200',
  // 충북
  '청주시': '43111',
  '충주시': '43130',
  // 전북
  '전주시': '45111',
  '익산시': '45130',
  // 전남
  '광주광역시': '29000',
  '순천시': '46150',
  // 경북
  '포항시': '47111',
  '구미시': '47190',
  // 경남
  '창원시': '48121',
  '김해시': '48250',
  // 강원
  '춘천시': '51110',
  '원주시': '51130',
  // 경기 (지방 취급)
  '평택시': '41220',
  '화성시': '41590',
}

interface RealPriceData {
  sido: string
  sigungu: string
  dong: string
  apartmentName: string
  dealYear: number
  dealMonth: number
  dealPrice: number
  areaM2: number
  floor: number
}

async function fetchRealPrices(
  regionCode: string,
  dealYearMonth: string
): Promise<RealPriceData[]> {
  if (!MOLIT_API_KEY) {
    throw new Error('MOLIT_API_KEY is not set')
  }

  const url = new URL(MOLIT_BASE_URL)
  url.searchParams.append('serviceKey', MOLIT_API_KEY)
  url.searchParams.append('LAWD_CD', regionCode)
  url.searchParams.append('DEAL_YMD', dealYearMonth)
  url.searchParams.append('pageNo', '1')
  url.searchParams.append('numOfRows', '1000')

  try {
    const response = await fetch(url.toString())
    const text = await response.text()

    // XML 파싱 (간단한 정규식 사용)
    const items: RealPriceData[] = []
    const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || []

    for (const itemXml of itemMatches) {
      const getValue = (tag: string): string => {
        const match = itemXml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))
        return match ? match[1].trim() : ''
      }

      const areaM2 = parseFloat(getValue('excluUseAr')) || 0
      const dealPrice = parseInt(getValue('dealAmount').replace(/,/g, '')) || 0

      // 59㎡ 이상 (지방 대형) 필터
      if (areaM2 < 59) continue

      items.push({
        sido: getValue('법정동시도명') || getValue('sidoName') || '',
        sigungu: getValue('법정동시군구명') || getValue('sigunguName') || '',
        dong: getValue('법정동읍면동명') || getValue('umdNm') || '',
        apartmentName: getValue('아파트') || getValue('aptNm') || '',
        dealYear: parseInt(getValue('dealYear')) || parseInt(dealYearMonth.slice(0, 4)),
        dealMonth: parseInt(getValue('dealMonth')) || parseInt(dealYearMonth.slice(4)),
        dealPrice: dealPrice * 10000, // 만원 → 원
        areaM2,
        floor: parseInt(getValue('floor')) || 0,
      })
    }

    console.log(`  📊 ${regionCode} ${dealYearMonth}: ${items.length}건 조회`)
    return items

  } catch (error) {
    console.error(`  ❌ API 호출 실패:`, error)
    return []
  }
}

async function calculateTurnoverRate(
  apartmentName: string,
  sido: string,
  sigungu: string
): Promise<{ turnoverRate: number; avgDealPrice: number; dealCount: number }> {
  // 최근 12개월 거래 데이터 조회
  const { data: deals, error } = await supabase
    .from('real_prices')
    .select('*')
    .eq('apartment_name', apartmentName)
    .eq('sido', sido)
    .eq('sigungu', sigungu)
    .order('deal_year', { ascending: false })
    .order('deal_month', { ascending: false })
    .limit(100)

  if (error || !deals || deals.length === 0) {
    return { turnoverRate: 0, avgDealPrice: 0, dealCount: 0 }
  }

  const dealCount = deals.length
  const avgDealPrice = Math.round(
    deals.reduce((sum, d) => sum + d.deal_price, 0) / dealCount
  )

  // 회전율 = 연간 거래건수 / 추정 세대수 * 100
  // 간단한 추정: 거래건수 * 12 / 거래데이터개월수
  const turnoverRate = Math.round((dealCount / 12) * 100 * 10) / 10

  return { turnoverRate, avgDealPrice, dealCount }
}

async function updateTurnoverRates() {
  console.log('\n📈 회전율 계산 중...')

  // 모든 경매 물건 조회
  const { data: items, error } = await supabase
    .from('auction_items')
    .select('id, apartment_name, sido, sigungu')

  if (error || !items) {
    console.error('❌ 물건 조회 실패:', error)
    return
  }

  for (const item of items) {
    const { turnoverRate, avgDealPrice, dealCount } = await calculateTurnoverRate(
      item.apartment_name || '',
      item.sido,
      item.sigungu
    )

    // turnover_rates 테이블 업데이트
    await supabase.from('turnover_rates').upsert({
      auction_item_id: item.id,
      turnover_rate: turnoverRate,
      avg_deal_price: avgDealPrice,
      deal_count: dealCount,
      calculation_period: '최근 12개월',
    }, { onConflict: 'auction_item_id' })

    console.log(`  ✅ ${item.apartment_name}: ${turnoverRate}% (${dealCount}건)`)
  }

  console.log('✅ 회전율 업데이트 완료!')
}

async function main() {
  console.log('🏠 국토부 실거래가 API 수집 시작\n')

  if (!MOLIT_API_KEY) {
    console.error('❌ MOLIT_API_KEY가 설정되지 않았습니다.')
    console.log('📝 https://www.data.go.kr에서 API 키를 발급받으세요.')
    return
  }

  // 최근 12개월 데이터 수집
  const now = new Date()
  const allPrices: RealPriceData[] = []

  for (const [cityName, regionCode] of Object.entries(REGION_CODES)) {
    console.log(`\n📍 ${cityName} (${regionCode}) 데이터 수집 중...`)

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dealYearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`

      const prices = await fetchRealPrices(regionCode, dealYearMonth)
      allPrices.push(...prices)

      // Rate limiting
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\n💾 총 ${allPrices.length}건 데이터 저장 중...`)

  // 데이터베이스 저장 (배치)
  const batchSize = 100
  for (let i = 0; i < allPrices.length; i += batchSize) {
    const batch = allPrices.slice(i, i + batchSize).map(p => ({
      sido: p.sido,
      sigungu: p.sigungu,
      dong: p.dong,
      apartment_name: p.apartmentName,
      deal_year: p.dealYear,
      deal_month: p.dealMonth,
      deal_price: p.dealPrice,
      area_m2: p.areaM2,
      floor: p.floor,
    }))

    const { error } = await supabase.from('real_prices').upsert(batch)
    if (error) {
      console.error(`  ⚠️ 배치 ${i / batchSize + 1} 저장 실패:`, error)
    }
  }

  console.log('✅ 실거래 데이터 저장 완료!')

  // 회전율 업데이트
  await updateTurnoverRates()

  console.log('\n🎉 모든 작업 완료!')
}

main()
