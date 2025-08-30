/**
 * Calcula comisiones de compra y venta para simulación de break-even
 */
export function calculateCommissions(
  purchasePrice: number,
  quantity: number,
  currentPrice: number,
  commissionRate = 0.005
) {
  const totalInvestment = purchasePrice * quantity
  const buyCommission = Math.max(totalInvestment * commissionRate, 150) * 1.21
  const sellCommission = Math.max(currentPrice * quantity * commissionRate, 150) * 1.21

  return { buyCommission, sellCommission, totalInvestment }
}

/**
 * Calcula métricas de break-even
 */
export function calculateBreakEvenMetrics(
  totalInvestment: number,
  quantity: number,
  currentPrice: number,
  totalCosts: number
) {
  const breakEvenPrice = (totalInvestment + totalCosts) / quantity
  const profit = (currentPrice * quantity) - totalInvestment - totalCosts
  const profitPercentage = (profit / totalInvestment) * 100
  const distanceToBreakEven = currentPrice - breakEvenPrice
  const distancePercentage = ((currentPrice - breakEvenPrice) / breakEvenPrice) * 100

  return {
    breakEvenPrice,
    profit,
    profitPercentage,
    distanceToBreakEven,
    distancePercentage
  }
}