/**
 * 하옥션 크롤러
 * Playwright를 사용하여 하옥션에서 경매 물건 데이터를 수집합니다.
 *
 * 사용법:
 * npx ts-node scripts/crawler.ts
 */

import { chromium, Browser, Page } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const HAUCTION_URL = 'https://www.hauction.co.kr'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface CrawledItem {
  caseNumber: string
  court: string
  propertyType: string
  address: string
  sido: string
  sigungu: string
  dong: string
  apartmentName: string
  dongHo: string
  areaM2: number
  appraisalPrice: number
  minimumPrice: number
  failCount: number
  auctionDate: string
  isSafe: boolean
  rightsAnalysis: string
  sourceUrl: string
}

class HauctionCrawler {
  private browser: Browser | null = null
  private page: Page | null = null

  async init() {
    console.log('🚀 크롤러 초기화 중...')
    this.browser = await chromium.launch({
      headless: false, // 디버깅 시 false로 설정
    })
    this.page = await this.browser.newPage()

    // 타임아웃 설정
    this.page.setDefaultTimeout(30000)
  }

  async login() {
    if (!this.page) throw new Error('Browser not initialized')

    const email = process.env.HAUCTION_EMAIL
    const password = process.env.HAUCTION_PASSWORD

    if (!email || !password) {
      throw new Error('HAUCTION_EMAIL and HAUCTION_PASSWORD must be set')
    }

    console.log('🔑 로그인 시도 중...')

    // 하옥션 메인 페이지 접속
    await this.page.goto(HAUCTION_URL)

    // 로그인 버튼 클릭
    await this.page.click('text=로그인')

    // 카카오 로그인 버튼 찾기 및 클릭
    await this.page.waitForTimeout(1000)

    // 카카오 로그인
    const kakaoButton = this.page.locator('a:has-text("카카오"), button:has-text("카카오")')
    if (await kakaoButton.count() > 0) {
      await kakaoButton.first().click()

      // 카카오 로그인 페이지에서 계정 입력
      await this.page.waitForURL(/accounts\.kakao\.com/, { timeout: 10000 })

      await this.page.fill('input[name="loginId"], input[name="email"]', email)
      await this.page.fill('input[name="password"]', password)
      await this.page.click('button[type="submit"]')

      // 로그인 완료 대기
      await this.page.waitForURL(/hauction\.co\.kr/, { timeout: 30000 })
    }

    console.log('✅ 로그인 성공!')
  }

  async searchApartments(options: {
    sido?: string
    propertyType?: string
    minArea?: number
    maxPrice?: number
    failCountMin?: number
    failCountMax?: number
  } = {}) {
    if (!this.page) throw new Error('Browser not initialized')

    console.log('🔍 아파트 검색 중...')

    // 검색 페이지로 이동
    await this.page.goto(`${HAUCTION_URL}/search`)

    // 필터 설정
    // 물건 종류: 아파트
    await this.page.selectOption('select[name="propertyType"]', 'APT')

    // 지역 선택 (지방: 서울/경기/인천 제외)
    if (options.sido) {
      await this.page.selectOption('select[name="sido"]', options.sido)
    }

    // 면적 필터
    if (options.minArea) {
      await this.page.fill('input[name="minArea"]', options.minArea.toString())
    }

    // 검색 실행
    await this.page.click('button[type="submit"], button:has-text("검색")')

    // 결과 대기
    await this.page.waitForSelector('.search-result, .item-list', { timeout: 10000 })

    console.log('✅ 검색 완료!')
  }

  async extractItems(): Promise<CrawledItem[]> {
    if (!this.page) throw new Error('Browser not initialized')

    console.log('📦 물건 데이터 추출 중...')

    const items: CrawledItem[] = []

    // 물건 목록 추출
    const itemElements = this.page.locator('.item-card, .auction-item, tr.item-row')
    const count = await itemElements.count()

    console.log(`📊 총 ${count}개 물건 발견`)

    for (let i = 0; i < count; i++) {
      try {
        const item = itemElements.nth(i)

        // 기본 정보 추출
        const caseNumber = await item.locator('.case-number, [data-case]').textContent() || ''
        const address = await item.locator('.address').textContent() || ''
        const priceText = await item.locator('.price, .minimum-price').textContent() || ''
        const appraisalText = await item.locator('.appraisal-price').textContent() || ''
        const areaText = await item.locator('.area').textContent() || ''
        const failCountText = await item.locator('.fail-count, .bid-count').textContent() || ''

        // 주소 파싱
        const addressParts = this.parseAddress(address)

        // 가격 파싱
        const minimumPrice = this.parsePrice(priceText)
        const appraisalPrice = this.parsePrice(appraisalText)

        // 면적 파싱
        const areaM2 = this.parseArea(areaText)

        // 유찰 횟수 파싱
        const failCount = this.parseFailCount(failCountText)

        // 상세 페이지 URL
        const sourceUrl = await item.locator('a').getAttribute('href') || ''

        items.push({
          caseNumber: caseNumber.trim(),
          court: '', // 상세 페이지에서 추출 필요
          propertyType: 'APT',
          address: address.trim(),
          sido: addressParts.sido,
          sigungu: addressParts.sigungu,
          dong: addressParts.dong,
          apartmentName: addressParts.apartmentName,
          dongHo: addressParts.dongHo,
          areaM2,
          appraisalPrice,
          minimumPrice,
          failCount,
          auctionDate: '', // 상세 페이지에서 추출 필요
          isSafe: true, // 기본값, 상세 분석 필요
          rightsAnalysis: '',
          sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `${HAUCTION_URL}${sourceUrl}`,
        })
      } catch (error) {
        console.error(`⚠️ 물건 ${i + 1} 추출 실패:`, error)
      }
    }

    console.log(`✅ ${items.length}개 물건 추출 완료!`)
    return items
  }

  async extractDetailedInfo(item: CrawledItem): Promise<CrawledItem> {
    if (!this.page) throw new Error('Browser not initialized')

    try {
      await this.page.goto(item.sourceUrl)
      await this.page.waitForSelector('.detail-content, .item-detail', { timeout: 10000 })

      // 법원 정보
      const court = await this.page.locator('.court-name, [data-court]').textContent()
      if (court) item.court = court.trim()

      // 매각기일
      const auctionDate = await this.page.locator('.auction-date, [data-date]').textContent()
      if (auctionDate) item.auctionDate = this.parseDate(auctionDate)

      // 권리분석
      const rightsAnalysis = await this.page.locator('.rights-analysis, .analysis-content').textContent()
      if (rightsAnalysis) {
        item.rightsAnalysis = rightsAnalysis.trim()
        // 인수사항 체크
        item.isSafe = !rightsAnalysis.includes('인수') &&
                      !rightsAnalysis.includes('선순위') &&
                      !rightsAnalysis.includes('대항력')
      }

    } catch (error) {
      console.error(`⚠️ 상세 정보 추출 실패: ${item.caseNumber}`, error)
    }

    return item
  }

  private parseAddress(address: string): {
    sido: string
    sigungu: string
    dong: string
    apartmentName: string
    dongHo: string
  } {
    // 주소 파싱 로직
    const parts = address.split(' ')
    return {
      sido: parts[0] || '',
      sigungu: parts[1] || '',
      dong: parts[2] || '',
      apartmentName: parts.slice(3, -1).join(' ') || '',
      dongHo: parts[parts.length - 1] || '',
    }
  }

  private parsePrice(priceText: string): number {
    // "2억 4,000만" -> 240000000
    const text = priceText.replace(/,/g, '').trim()
    let price = 0

    const billions = text.match(/(\d+)억/)
    const millions = text.match(/(\d+)만/)

    if (billions) price += parseInt(billions[1]) * 100000000
    if (millions) price += parseInt(millions[1]) * 10000

    return price
  }

  private parseArea(areaText: string): number {
    // "84.92㎡" -> 84.92
    const match = areaText.match(/(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 0
  }

  private parseFailCount(text: string): number {
    // "2회 유찰" -> 2
    const match = text.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  private parseDate(dateText: string): string {
    // "2025.01.15" -> "2025-01-15"
    return dateText.replace(/\./g, '-').trim()
  }

  async saveToDatabase(items: CrawledItem[]) {
    console.log('💾 데이터베이스 저장 중...')

    const dbItems = items.map(item => ({
      case_number: item.caseNumber,
      court: item.court,
      property_type: item.propertyType,
      address: item.address,
      sido: item.sido,
      sigungu: item.sigungu,
      dong: item.dong,
      apartment_name: item.apartmentName,
      dong_ho: item.dongHo,
      area_m2: item.areaM2,
      appraisal_price: item.appraisalPrice,
      minimum_price: item.minimumPrice,
      fail_count: item.failCount,
      auction_date: item.auctionDate || null,
      is_safe: item.isSafe,
      rights_analysis: item.rightsAnalysis,
      source_url: item.sourceUrl,
    }))

    const { data, error } = await supabase
      .from('auction_items')
      .upsert(dbItems, { onConflict: 'case_number' })
      .select()

    if (error) {
      console.error('❌ 저장 실패:', error)
      throw error
    }

    console.log(`✅ ${data?.length || 0}개 물건 저장 완료!`)
    return data
  }

  async logCrawl(status: string, itemsCount: number, errorMessage?: string) {
    await supabase.from('crawl_logs').insert({
      crawl_type: 'hauction',
      status,
      items_count: itemsCount,
      error_message: errorMessage,
      completed_at: status !== 'running' ? new Date().toISOString() : null,
    })
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      console.log('🔒 브라우저 종료')
    }
  }
}

// 메인 실행
async function main() {
  const crawler = new HauctionCrawler()

  try {
    await crawler.init()
    await crawler.logCrawl('running', 0)

    // 로그인
    await crawler.login()

    // 지방 대형 아파트 검색
    const regions = ['충남', '충북', '전북', '전남', '경북', '경남', '강원', '제주']

    const allItems: CrawledItem[] = []

    for (const sido of regions) {
      console.log(`\n📍 ${sido} 지역 검색 중...`)

      await crawler.searchApartments({
        sido,
        propertyType: 'APT',
        minArea: 59,
      })

      const items = await crawler.extractItems()

      // 상세 정보 추출 (처음 10개만, 시간 절약)
      for (let i = 0; i < Math.min(items.length, 10); i++) {
        items[i] = await crawler.extractDetailedInfo(items[i])
        await new Promise(r => setTimeout(r, 1000)) // Rate limiting
      }

      allItems.push(...items)
    }

    // 데이터베이스 저장
    await crawler.saveToDatabase(allItems)
    await crawler.logCrawl('success', allItems.length)

    console.log(`\n🎉 크롤링 완료! 총 ${allItems.length}개 물건 수집`)

  } catch (error) {
    console.error('❌ 크롤링 실패:', error)
    await crawler.logCrawl('failed', 0, String(error))
  } finally {
    await crawler.close()
  }
}

main()
