'use client'

import { useState, useMemo } from 'react'
import { TrendingDown } from 'lucide-react'
import { FilterPanel, AuctionCard, BottomNav } from '@/components'
import { sampleAuctionItems, filterAuctionItems } from '@/lib/sampleData'

type TabType = 'dashboard' | 'favorites' | 'notifications' | 'settings'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [favorites, setFavorites] = useState<string[]>([])

  const [filters, setFilters] = useState({
    minTurnoverRate: 3.0,
    maxInvestment: 50000000,
    failCountFilter: [1, 2],
    safeOnly: true,
  })

  const filteredItems = useMemo(() => {
    return filterAuctionItems(sampleAuctionItems, filters)
  }, [filters])

  const averageDiscount = useMemo(() => {
    if (filteredItems.length === 0) return 0
    const total = filteredItems.reduce((sum, item) => sum + item.discount_rate, 0)
    return Math.round(total / filteredItems.length)
  }, [filteredItems])

  const handleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
    )
  }

  const favoriteItems = sampleAuctionItems.filter(item => favorites.includes(item.id))

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">BigShort</h1>
            <p className="text-sm text-muted-foreground">전문 경매 필터링 대시보드</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            실시간 업데이트
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {activeTab === 'dashboard' && (
          <>
            {/* Filter Panel */}
            <FilterPanel
              minTurnoverRate={filters.minTurnoverRate}
              maxInvestment={filters.maxInvestment}
              failCountFilter={filters.failCountFilter}
              safeOnly={filters.safeOnly}
              onFilterChange={setFilters}
            />

            {/* Results Summary */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">필터링 결과:</span>
                <span className="text-primary font-bold">{filteredItems.length}건</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-muted-foreground">평균 할인율:</span>
                <span className="text-destructive font-bold">{averageDiscount}%</span>
              </div>
            </div>

            {/* Auction Items Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => (
                <AuctionCard
                  key={item.id}
                  item={item}
                  onFavorite={handleFavorite}
                  isFavorite={favorites.includes(item.id)}
                />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">필터 조건에 맞는 물건이 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">필터를 조정해보세요.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">관심 물건</h2>
            {favoriteItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {favoriteItems.map(item => (
                  <AuctionCard
                    key={item.id}
                    item={item}
                    onFavorite={handleFavorite}
                    isFavorite={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">관심 물건이 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">하트를 눌러 관심 물건을 추가하세요.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">알림</h2>
            <div className="text-center py-12">
              <p className="text-muted-foreground">새로운 알림이 없습니다.</p>
              <p className="text-sm text-muted-foreground mt-2">조건에 맞는 물건이 등록되면 알려드립니다.</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">설정</h2>

            {/* 데이터 소스 */}
            <div className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-medium mb-2">데이터 소스</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">현재: 샘플 데이터</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supabase 연동 시 실시간 데이터 사용
                  </p>
                </div>
                <div className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs">
                  데모 모드
                </div>
              </div>
            </div>

            {/* 수익 계산기 */}
            <div className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-medium mb-3">빠른 수익 계산기</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">예시 최저가</span>
                  <span className="font-medium">2억 4,000만원</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">보증금+잔금 (20%)</span>
                  <span>4,800만원</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">취등록세 (1.3%)</span>
                  <span>312만원</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">기타비용</span>
                  <span>300만원</span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="font-medium">실투자금 합계</span>
                  <span className="text-primary font-bold">약 5,412만원</span>
                </div>
              </div>
            </div>

            {/* 알림 설정 */}
            <div className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-medium mb-2">알림 설정</h3>
              <p className="text-sm text-muted-foreground">푸시 알림 기능은 준비 중입니다.</p>
            </div>

            {/* 6단계 필터링 설명 */}
            <div className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-medium mb-3">6단계 필터링 알고리즘</h3>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li>1. <span className="text-foreground">기본 타겟팅</span> - 지방 대형 아파트 (59㎡↑)</li>
                <li>2. <span className="text-foreground">입찰 차수</span> - 신건~3회 유찰 물건</li>
                <li>3. <span className="text-foreground">유동성</span> - 거래 회전율 3% 이상</li>
                <li>4. <span className="text-foreground">실투자금</span> - 5,000만원 이하</li>
                <li>5. <span className="text-foreground">권리 안전</span> - 인수사항 없음</li>
                <li>6. <span className="text-foreground">특수물건 배제</span> - 지분/토지별도 제외</li>
              </ol>
            </div>

            {/* 버전 정보 */}
            <div className="text-center text-xs text-muted-foreground pt-4">
              BigShort v0.1.0 - 경매 물건 필터링 대시보드
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
