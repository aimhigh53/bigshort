import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Vercel Cron Job에서 호출되는 API
// 매일 아침 9시에 자동으로 새 아파트 데이터 수집

const HAUCTION_API = 'https://api.hauction.co.kr/api/v1/auction/realestate'

interface HauctionItem {
  unique_id: string
  category: string
  address: string
  thumbnail: string | null
  court_name?: string
  department?: string
  apsl_amount: number
  minb_amount: number
  minb_rate?: number
  rt_sqm?: string
  bldg_sqm?: string
  bid_dttm?: string
}

interface HauctionResponse {
  count: number
  results: HauctionItem[]
}

function normalizeSido(address: string): string {
  const parts = address.split(' ')
  let sido = parts[0] || ''

  if (sido.includes('서울')) return '서울'
  if (sido.includes('부산')) return '부산'
  if (sido.includes('대구')) return '대구'
  if (sido.includes('인천')) return '인천'
  if (sido.includes('광주')) return '광주'
  if (sido.includes('대전')) return '대전'
  if (sido.includes('울산')) return '울산'
  if (sido.includes('세종')) return '세종'
  if (sido.includes('경기')) return '경기'
  if (sido.includes('강원')) return '강원'
  if (sido.includes('충북') || sido.includes('충청북')) return '충북'
  if (sido.includes('충남') || sido.includes('충청남')) return '충남'
  if (sido.includes('전북') || sido.includes('전라북')) return '전북'
  if (sido.includes('전남') || sido.includes('전라남')) return '전남'
  if (sido.includes('경북') || sido.includes('경상북')) return '경북'
  if (sido.includes('경남') || sido.includes('경상남')) return '경남'
  if (sido.includes('제주')) return '제주'

  return sido
}

function transformApartment(item: HauctionItem) {
  const address = item.address || ''
  const parts = address.split(' ')
  const sido = normalizeSido(address)
  const sigungu = parts[1] || ''

  const appraisalValue = item.apsl_amount || 0
  const minimumBid = item.minb_amount || 0
  const discountRate = appraisalValue > 0 ? Math.round((1 - minimumBid / appraisalValue) * 100) : 0

  const areaM2 = parseFloat(item.rt_sqm || '') || parseFloat(item.bldg_sqm || '') || 84

  // 아파트 이름 추출
  let apartmentName = '아파트'
  const aptMatch = address.match(/([가-힣A-Za-z0-9]+(?:아파트|파크|빌|타워|하이츠|맨션|블루온|아델리움))/)
  if (aptMatch) apartmentName = aptMatch[1]

  // 동호 추출
  let dongHo = null
  const dongMatch = address.match(/(\d+동\s*\d+층?\d*호?)/)
  if (dongMatch) dongHo = dongMatch[1]

  // 유찰 횟수 계산
  const minbRate = item.minb_rate || 100
  let failCount = 0
  if (minbRate < 100) failCount = 1
  if (minbRate < 80) failCount = 2
  if (minbRate < 64) failCount = 3
  if (minbRate < 51) failCount = 4

  const isSafe = failCount <= 2 && discountRate <= 40

  return {
    case_number: `apt_${item.unique_id || Date.now()}`,
    court: item.court_name || item.department || '정보없음',
    property_type: 'APT',
    address: address,
    sido: sido,
    sigungu: sigungu,
    dong: parts[2] || null,
    apartment_name: apartmentName,
    dong_ho: dongHo,
    area_m2: areaM2,
    appraisal_price: appraisalValue,
    minimum_price: minimumBid,
    fail_count: failCount,
    auction_date: item.bid_dttm ? item.bid_dttm.split('T')[0] : null,
    is_safe: isSafe,
    source_url: `https://www.hauction.co.kr/auction/item/${item.unique_id}`,
    image_urls: item.thumbnail ? [item.thumbnail] : null
  }
}

async function fetchHauctionAPI(page: number, size: number): Promise<HauctionResponse | null> {
  try {
    const response = await fetch(`${HAUCTION_API}?page=${page}&size=${size}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // 개발 환경이거나 CRON_SECRET이 없으면 허용
    if (process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient()
  const collectedApartments: ReturnType<typeof transformApartment>[] = []

  // Vercel 10초 타임아웃 내에서 빠르게 수집
  // 랜덤 페이지에서 소량의 데이터만 수집
  const randomPages = [
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 500) + 200,
    Math.floor(Math.random() * 500) + 700
  ]

  for (const page of randomPages) {
    const apiResponse = await fetchHauctionAPI(page, 50)

    if (!apiResponse?.results?.length) continue

    // 아파트만 필터링 (이미지 있고, 가격 있는 것만)
    const apartments = apiResponse.results.filter(item =>
      item.category === '아파트' &&
      item.thumbnail &&
      item.apsl_amount > 0
    )

    for (const apt of apartments) {
      collectedApartments.push(transformApartment(apt))
    }

    // 10개만 수집 (빠른 실행을 위해)
    if (collectedApartments.length >= 10) break
  }

  if (collectedApartments.length === 0) {
    return NextResponse.json({
      success: true,
      message: '새로운 아파트 데이터 없음',
      collected: 0,
      inserted: 0
    })
  }

  // Supabase에 데이터 삽입 (중복 무시)
  let inserted = 0

  for (const apt of collectedApartments) {
    // 중복 체크
    const { data: existing } = await supabase
      .from('auction_items')
      .select('id')
      .eq('case_number', apt.case_number)
      .single()

    if (existing) continue

    // 삽입
    const { error } = await supabase
      .from('auction_items')
      .insert(apt)

    if (!error) inserted++
  }

  return NextResponse.json({
    success: true,
    message: `데이터 수집 완료`,
    collected: collectedApartments.length,
    inserted: inserted,
    timestamp: new Date().toISOString()
  })
}
