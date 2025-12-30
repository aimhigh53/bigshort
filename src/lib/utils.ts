import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 가격 포맷팅 (억/만 단위)
export function formatPrice(price: number): string {
  if (price >= 100000000) {
    const uk = Math.floor(price / 100000000);
    const man = Math.floor((price % 100000000) / 10000);
    if (man > 0) {
      return `${uk}억 ${man.toLocaleString()}만`;
    }
    return `${uk}억`;
  }
  if (price >= 10000) {
    return `${Math.floor(price / 10000).toLocaleString()}만`;
  }
  return price.toLocaleString();
}

// 평수 계산 (㎡ → 평)
export function m2ToPyeong(m2: number): number {
  return Math.round(m2 / 3.306 * 10) / 10;
}

// 할인율 계산
export function calculateDiscountRate(appraisal: number, minimum: number): number {
  return Math.round((1 - minimum / appraisal) * 100 * 10) / 10;
}

// 실투자금 계산
export function calculateRequiredInvestment(minimumPrice: number): number {
  const depositAndBalance = minimumPrice * 0.2; // 보증금 10% + 잔금 10%
  const acquisitionTax = minimumPrice * 0.013; // 취득세 1.3%
  const miscCost = 3000000; // 부대비용 300만원
  return Math.round(depositAndBalance + acquisitionTax + miscCost);
}

// 회전율 계산
export function calculateTurnoverRate(
  transactionCount: number,
  totalUnits: number
): number {
  if (totalUnits === 0) return 0;
  return Math.round((transactionCount / totalUnits) * 100 * 10) / 10;
}

// 지역 필터 (서울, 경기, 인천 제외)
export function isLocalRegion(region: string): boolean {
  const excludedRegions = ['서울', '경기', '인천'];
  return !excludedRegions.some(excluded => region.includes(excluded));
}

// 대형 평수 필터 (85㎡ 초과)
export function isLargeArea(areaM2: number): boolean {
  return areaM2 > 85;
}

// 유찰 횟수 필터 (1~2회)
export function isValidFailCount(failCount: number): boolean {
  return failCount === 1 || failCount === 2;
}
