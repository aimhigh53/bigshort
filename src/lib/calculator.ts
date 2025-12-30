import type { CalculatorInput, CalculatorResult } from '@/types/auction'

export function calculateProfit(input: CalculatorInput): CalculatorResult {
  const {
    expectedBidPrice,
    expectedSalePrice,
    loanRate = 0.8,  // 대출비율 80%
    interestRate = 0.05,  // 연이자율 5%
  } = input;

  // 매입 비용
  const deposit = expectedBidPrice * 0.1;  // 보증금 10%
  const balance = expectedBidPrice * 0.1;  // 잔금 10%
  const acquisitionTax = expectedBidPrice * 0.013;  // 취득세 1.3%
  const miscCost = 3000000;  // 부대비용 300만원 (법무비 등)

  const totalInvestment = deposit + balance + acquisitionTax + miscCost;

  // 대출 정보
  const loanAmount = expectedBidPrice * loanRate;
  const monthlyInterest = Math.round(loanAmount * interestRate / 12);

  // 매도 비용
  const vat = expectedSalePrice * 0.03;  // 부가세 약식 3%
  const brokerageFee = Math.min(expectedSalePrice * 0.004, 9000000);  // 중개수수료 (최대 900만원)

  // 순수익 계산
  const grossProfit = expectedSalePrice - expectedBidPrice;
  const totalCost = acquisitionTax + miscCost + vat + brokerageFee;
  const netProfit = grossProfit - totalCost;

  // ROI 계산
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  return {
    deposit: Math.round(deposit),
    balance: Math.round(balance),
    acquisitionTax: Math.round(acquisitionTax),
    miscCost,
    totalInvestment: Math.round(totalInvestment),
    loanAmount: Math.round(loanAmount),
    monthlyInterest,
    vat: Math.round(vat),
    brokerageFee: Math.round(brokerageFee),
    netProfit: Math.round(netProfit),
    roi: Math.round(roi * 10) / 10,
  };
}

// 실투자금으로 진입 가능 여부 판단
export function canEnterWithBudget(
  minimumPrice: number,
  maxBudget: number = 50000000
): boolean {
  const deposit = minimumPrice * 0.1;
  const balance = minimumPrice * 0.1;
  const acquisitionTax = minimumPrice * 0.013;
  const miscCost = 3000000;

  const requiredInvestment = deposit + balance + acquisitionTax + miscCost;
  return requiredInvestment <= maxBudget;
}
