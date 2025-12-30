'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AuctionItem } from '@/types/auction'

interface FilterParams {
  minTurnoverRate: number
  maxInvestment: number
  failCountFilter: number[]
  safeOnly: boolean
}

interface UseAuctionItemsResult {
  items: AuctionItem[]
  loading: boolean
  error: string | null
  refetch: () => void
  stats: {
    count: number
    avgDiscount: number
  }
}

/**
 * 경매 물건 데이터 fetching hook
 */
export function useAuctionItems(filters: FilterParams): UseAuctionItemsResult {
  const [items, setItems] = useState<AuctionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        minTurnoverRate: filters.minTurnoverRate.toString(),
        maxInvestment: filters.maxInvestment.toString(),
        failCounts: filters.failCountFilter.join(','),
        safeOnly: filters.safeOnly.toString(),
        propertyType: 'APT',
      })

      const response = await fetch(`/api/auctions?${params}`)

      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // 통계 계산
  const stats = {
    count: items.length,
    avgDiscount: items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.discount_rate, 0) / items.length)
      : 0,
  }

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    stats,
  }
}

/**
 * 즐겨찾기 관리 hook
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  // LocalStorage에서 로드
  useEffect(() => {
    const stored = localStorage.getItem('bigshort_favorites')
    if (stored) {
      try {
        setFavorites(JSON.parse(stored))
      } catch {
        console.error('Failed to parse favorites')
      }
    }
  }, [])

  // LocalStorage에 저장
  const saveFavorites = useCallback((newFavorites: string[]) => {
    localStorage.setItem('bigshort_favorites', JSON.stringify(newFavorites))
    setFavorites(newFavorites)
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
      localStorage.setItem('bigshort_favorites', JSON.stringify(newFavorites))
      return newFavorites
    })
  }, [])

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id)
  }, [favorites])

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    saveFavorites,
  }
}

/**
 * 필터 프리셋 관리 hook
 */
export function useFilterPresets() {
  const [presets, setPresets] = useState<Record<string, FilterParams>>({})

  useEffect(() => {
    const stored = localStorage.getItem('bigshort_presets')
    if (stored) {
      try {
        setPresets(JSON.parse(stored))
      } catch {
        console.error('Failed to parse presets')
      }
    }
  }, [])

  const savePreset = useCallback((name: string, filters: FilterParams) => {
    setPresets(prev => {
      const newPresets = { ...prev, [name]: filters }
      localStorage.setItem('bigshort_presets', JSON.stringify(newPresets))
      return newPresets
    })
  }, [])

  const deletePreset = useCallback((name: string) => {
    setPresets(prev => {
      const newPresets = { ...prev }
      delete newPresets[name]
      localStorage.setItem('bigshort_presets', JSON.stringify(newPresets))
      return newPresets
    })
  }, [])

  return {
    presets,
    savePreset,
    deletePreset,
  }
}
