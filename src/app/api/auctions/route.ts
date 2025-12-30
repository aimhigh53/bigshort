import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const searchParams = request.nextUrl.searchParams

  // 필터 파라미터
  const minTurnoverRate = parseFloat(searchParams.get('minTurnoverRate') || '0')
  const maxInvestment = parseInt(searchParams.get('maxInvestment') || '100000000')
  const failCounts = searchParams.get('failCounts')?.split(',').map(Number) || []
  const safeOnly = searchParams.get('safeOnly') === 'true'
  const sido = searchParams.get('sido')
  const propertyType = searchParams.get('propertyType') || 'APT'

  try {
    // filtered_auction_items 뷰 사용
    let query = supabase
      .from('filtered_auction_items')
      .select('*')
      .eq('property_type', propertyType)

    // 회전율 필터
    if (minTurnoverRate > 0) {
      query = query.gte('turnover_rate', minTurnoverRate)
    }

    // 실투자금 필터
    if (maxInvestment > 0) {
      query = query.lte('required_investment', maxInvestment)
    }

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

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 응답 데이터 변환
    const items = data?.map(item => ({
      id: item.id,
      caseNumber: item.case_number,
      court: item.court,
      propertyType: item.property_type,
      address: item.address,
      sido: item.sido,
      sigungu: item.sigungu,
      dong: item.dong,
      apartmentName: item.apartment_name,
      dongHo: item.dong_ho,
      areaM2: item.area_m2,
      areaPy: item.area_py,
      appraisalPrice: item.appraisal_price,
      minimumPrice: item.minimum_price,
      discountRate: item.discount_rate,
      failCount: item.fail_count,
      auctionDate: item.auction_date,
      isSafe: item.is_safe,
      rightsAnalysis: item.rights_analysis,
      turnoverRate: item.turnover_rate,
      avgDealPrice: item.avg_deal_price,
      requiredInvestment: item.required_investment,
      sourceUrl: item.source_url,
      imageUrls: item.image_urls,
    })) || []

    return NextResponse.json({
      items,
      count: items.length,
      filters: {
        minTurnoverRate,
        maxInvestment,
        failCounts,
        safeOnly,
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
    const { data, error } = await supabase
      .from('auction_items')
      .upsert(
        items.map((item: Record<string, unknown>) => ({
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
