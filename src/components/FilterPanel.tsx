'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterPanelProps {
  minTurnoverRate: number
  maxInvestment: number
  failCountFilter: number[]
  safeOnly: boolean
  sizeFilter: string[]
  onFilterChange: (filters: {
    minTurnoverRate: number
    maxInvestment: number
    failCountFilter: number[]
    safeOnly: boolean
    sizeFilter: string[]
  }) => void
}

export function FilterPanel({
  minTurnoverRate,
  maxInvestment,
  failCountFilter,
  safeOnly,
  sizeFilter,
  onFilterChange,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleFailCount = (count: number) => {
    const newFilter = failCountFilter.includes(count)
      ? failCountFilter.filter(c => c !== count)
      : [...failCountFilter, count]
    onFilterChange({ minTurnoverRate, maxInvestment, failCountFilter: newFilter, safeOnly, sizeFilter })
  }

  const toggleSizeFilter = (size: string) => {
    const newFilter = sizeFilter.includes(size)
      ? sizeFilter.filter(s => s !== size)
      : [...sizeFilter, size]
    onFilterChange({ minTurnoverRate, maxInvestment, failCountFilter, safeOnly, sizeFilter: newFilter })
  }

  const sizeLabels = sizeFilter.length === 2 ? '전체 평형' :
    sizeFilter.includes('large') ? '대형(85㎡↑)' :
    sizeFilter.includes('small_medium') ? '중소형(85㎡↓)' : null

  const appliedFilters = [
    sizeLabels,
    `회전율 ${minTurnoverRate}%↑`,
    `실투자 ${maxInvestment / 10000}만↓`,
    safeOnly ? '안전권리' : null,
  ].filter(Boolean)

  return (
    <div className="bg-secondary rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">적용된 필터</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {appliedFilters.map((filter, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-muted rounded text-xs text-foreground"
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          {/* 최소 거래 회전율 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">최소 거래 회전율</span>
              <span className="text-sm font-medium text-primary">{minTurnoverRate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={minTurnoverRate}
              onChange={(e) => onFilterChange({
                minTurnoverRate: parseFloat(e.target.value),
                maxInvestment,
                failCountFilter,
                safeOnly,
                sizeFilter
              })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>10%+</span>
            </div>
          </div>

          {/* 최대 실투자금 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">최대 실투자금</span>
              <span className="text-sm font-medium text-primary">{maxInvestment / 10000}만</span>
            </div>
            <input
              type="range"
              min="10000000"
              max="100000000"
              step="5000000"
              value={maxInvestment}
              onChange={(e) => onFilterChange({
                minTurnoverRate,
                maxInvestment: parseInt(e.target.value),
                failCountFilter,
                safeOnly,
                sizeFilter
              })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1천만</span>
              <span>1억+</span>
            </div>
          </div>

          {/* 유찰 횟수 */}
          <div>
            <span className="text-sm text-muted-foreground block mb-2">유찰 횟수</span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '신건', value: 0 },
                { label: '1회', value: 1 },
                { label: '2회', value: 2 },
                { label: '3회+', value: 3 },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => toggleFailCount(value)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                    failCountFilter.includes(value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 안전한 물건만 보기 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">안전한 물건만 보기</span>
              <p className="text-xs text-muted-foreground">인수사항 없음</p>
            </div>
            <button
              onClick={() => onFilterChange({
                minTurnoverRate,
                maxInvestment,
                failCountFilter,
                safeOnly: !safeOnly,
                sizeFilter
              })}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                safeOnly ? 'bg-primary' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  safeOnly ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* 평형 필터 */}
          <div>
            <span className="text-sm text-muted-foreground block mb-2">평형 선택</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '대형 (85㎡ 초과)', value: 'large' },
                { label: '중소형 (85㎡ 이하)', value: 'small_medium' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => toggleSizeFilter(value)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                    sizeFilter.includes(value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 필터 적용 버튼 */}
          <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            필터 적용
          </button>
        </div>
      )}
    </div>
  )
}
