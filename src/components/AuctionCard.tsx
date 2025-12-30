'use client'

import { Heart, MapPin, Maximize2, TrendingDown, ExternalLink, ShieldCheck, RotateCcw } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { AuctionItem } from '@/types/auction'

interface AuctionCardProps {
  item: AuctionItem
  onFavorite?: (id: string) => void
  isFavorite?: boolean
}

export function AuctionCard({ item, onFavorite, isFavorite = false }: AuctionCardProps) {
  const naverUrl = `https://land.naver.com/search?query=${encodeURIComponent(
    `${item.region} ${item.city} ${item.apartment_name}`
  )}`

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      {/* Image Section */}
      <div className="relative h-48 bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.apartment_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
            <span className="text-4xl">🏢</span>
          </div>
        )}

        {/* Case Number Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded text-xs">
          {item.case_number}
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => onFavorite?.(item.id)}
          className="absolute top-3 left-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
          />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Location & Name */}
        <div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MapPin className="w-3 h-3" />
            <span>{item.region} {item.city}</span>
          </div>
          <h3 className="font-semibold text-lg mt-1">{item.apartment_name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>{item.dong} {item.floor}층</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              <span>전용 {item.area_m2}㎡ / {item.area_pyeong}평형</span>
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground">감정가</p>
            <p className="font-medium">{formatPrice(item.appraisal_price)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">최저가</p>
            <p className="font-medium text-primary">{formatPrice(item.minimum_price)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="w-3 h-3" />
              <span>할인율</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-destructive">{item.discount_rate}%</span>
              <span className="text-xs text-muted-foreground">{item.fail_count}회 유찰</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
            실투자 {formatPrice(item.required_investment)}
          </span>
          <span className="px-2 py-1 bg-success/10 text-success rounded text-xs font-medium">
            회전율 {item.turnover_rate}%
          </span>
          <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            {item.fail_count}회 유찰
          </span>
          {item.is_safe && (
            <span className="px-2 py-1 bg-success/10 text-success rounded text-xs font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              권리안전
            </span>
          )}
        </div>

        {/* External Links */}
        <a
          href={naverUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 bg-green-600/20 text-green-500 rounded-lg text-sm font-medium hover:bg-green-600/30 transition-colors"
        >
          <img src="https://land.naver.com/favicon.ico" alt="네이버" className="w-4 h-4" />
          네이버 부동산 호가 보기
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
