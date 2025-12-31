import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 실투자금 계산 함수
function calculateRequiredInvestment(minimumPrice: number): number {
  const depositAndBalance = minimumPrice * 0.2
  const acquisitionTax = minimumPrice * 0.013
  const miscCost = 3000000
  return Math.round(depositAndBalance + acquisitionTax + miscCost)
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const searchParams = request.nextUrl.searchParams

  // 필터 파라미터
  const minTurnoverRate = parseFloat(searchParams.get('minTurnoverRate') || '0')
  const maxInvestment = parseInt(searchParams.get('maxInvestment') || '100000000')
  const failCounts = searchParams.get('failCounts')?.split(',').map(Number) || []
  const safeOnly = searchParams.get('safeOnly') === 'true'
  const sizeFilter = searchParams.get('sizeFilter')?.split(',') || ['large', 'small_medium']
  const sido = searchParams.get('sido')
  const propertyType = searchParams.get('propertyType') || 'APT'

  try {
    // auction_items 테이블 조회
    let query = supabase
      .from('auction_items')
      .select('*')
      .eq('property_type', propertyType)

    // 유찰횟수 필터
    if (failCounts.length > 0) {
      query = query.in('fail_count', failCounts)
    }

    // 안전물건만 필터
    if (safeOnly) {
      query = query.eq('is_safe', true)
    }

    // 지역 필터
    if (sido) {
      query = query.eq('sido', sido)
    }

    // 매각기일 순 정렬
    query = query.order('auction_date', { ascending: true })

    const { data: auctionData, error: auctionError } = await query

    if (auctionError) {
      console.error('Supabase error:', auctionError)
      return NextResponse.json({ error: auctionError.message }, { status: 500 })
    }

    // turnover_rates 테이블 조회
    const itemIds = (auctionData || []).map((item: { id: string }) => item.id)
    const { data: turnoverData } = await supabase
      .from('turnover_rates')
      .select('*')
      .in('auction_item_id', itemIds)

    // 회전율 데이터를 맵으로 변환
    const turnoverMap = new Map<string, { turnover_rate: number; avg_deal_price: number | null }>()
    ;(turnoverData || []).forEach((tr: { auction_item_id: string; turnover_rate: number; avg_deal_price: number | null }) => {
      turnoverMap.set(tr.auction_item_id, {
        turnover_rate: tr.turnover_rate,
        avg_deal_price: tr.avg_deal_price
      })
    })

    // 응답 데이터 변환 및 필터링
    interface AuctionItemRow {
      id: string
      case_number: string
      court: string
      property_type: string
      address: string
      sido: string
      sigungu: string
      dong: string | null
      apartment_name: string | null
      dong_ho: string | null
      area_m2: number
      area_py: number
      appraisal_price: number
      minimum_price: number
      discount_rate: number
      fail_count: number
      auction_date: string | null
      is_safe: boolean
      rights_analysis: string | null
      source_url: string | null
      image_urls: string[] | null
    }

    const allItems = (auctionData || []).map((item: AuctionItemRow) => {
      const tr = turnoverMap.get(item.id)
      const requiredInvestment = calculateRequiredInvestment(item.minimum_price)

      // Parse dong_ho for floor info (e.g., "101동 1501호" -> floor: 15)
      let floor = 0
      if (item.dong_ho) {
        const hoMatch = item.dong_ho.match(/(\d+)호/)
        if (hoMatch) {
          floor = Math.floor(parseInt(hoMatch[1]) / 100)
        }
      }

      return {
        id: item.id,
        case_number: item.case_number,
        court: item.court,
        property_type: item.property_type,
        address: item.address,
        region: item.sido,
        city: item.sigungu,
        apartment_name: item.apartment_name || '아파트',
        dong: item.dong || item.dong_ho?.split(' ')[0] || '',
        floor: floor,
        area_m2: item.area_m2,
        area_pyeong: item.area_py,
        appraisal_price: item.appraisal_price,
        minimum_price: item.minimum_price,
        discount_rate: item.discount_rate,
        fail_count: item.fail_count,
        auction_date: item.auction_date,
        is_safe: item.is_safe,
        turnover_rate: tr?.turnover_rate ?? 0,
        required_investment: requiredInvestment,
        risk_factors: [],
        source_url: item.source_url || '',
        image_url: item.image_urls?.[0] || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    // 클라이언트 사이드 필터링 (회전율, 실투자금, 평형)
    const items = allItems.filter(item => {
      if (minTurnoverRate > 0 && (item.turnover_rate === null || item.turnover_rate < minTurnoverRate)) {
        return false
      }
      if (maxInvestment > 0 && item.required_investment > maxInvestment) {
        return false
      }
      // 평형 필터: large (85㎡ 초과), small_medium (85㎡ 이하)
      if (sizeFilter.length > 0 && sizeFilter.length < 2) {
        const isLarge = item.area_m2 > 85
        if (sizeFilter.includes('large') && !isLarge) {
          return false
        }
        if (sizeFilter.includes('small_medium') && isLarge) {
          return false
        }
      }
      return true
    })

    return NextResponse.json({
      items,
      count: items.length,
      filters: {
        minTurnoverRate,
        maxInvestment,
        failCounts,
        safeOnly,
        sizeFilter,
        sido,
        propertyType,
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // 크롤링 데이터 저장 API (관리자용)
  const supabase = createClient()

  try {
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Upsert 처리 (case_number 기준)
    interface InputItem {
      caseNumber: string
      court: string
      propertyType?: string
      address: string
      sido: string
      sigungu: string
      dong?: string
      apartmentName?: string
      dongHo?: string
      areaM2: number
      appraisalPrice: number
      minimumPrice: number
      failCount?: number
      auctionDate?: string
      isSafe?: boolean
      rightsAnalysis?: string
      sourceUrl?: string
      imageUrls?: string[]
    }

    const { data, error } = await supabase
      .from('auction_items')
      .upsert(
        items.map((item: InputItem) => ({
          case_number: item.caseNumber,
          court: item.court,
          property_type: item.propertyType || 'APT',
          address: item.address,
          sido: item.sido,
          sigungu: item.sigungu,
          dong: item.dong,
          apartment_name: item.apartmentName,
          dong_ho: item.dongHo,
          area_m2: item.areaM2,
          appraisal_price: item.appraisalPrice,
          minimum_price: item.minimumPrice,
          fail_count: item.failCount || 0,
          auction_date: item.auctionDate,
          is_safe: item.isSafe ?? true,
          rights_analysis: item.rightsAnalysis,
          source_url: item.sourceUrl,
          image_urls: item.imageUrls,
        })),
        { onConflict: 'case_number' }
      )
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
