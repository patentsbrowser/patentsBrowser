export const calculateMA = (data: any[], index: number, period: number) => {
  let sum = 0;
  for (let i = 0; i < period; i++) {
    if (index - i >= 0) {
      sum += data[index - i].close;
    }
  }
  return sum / period;
};

export const calculateRSI = (data: any[], period: number) => {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  // Calculate initial RSI
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i-1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate RSI for remaining periods
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i-1].close;
    
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }

    const rs = avgGain / avgLoss;
    rsi[i] = 100 - (100 / (1 + rs));
  }

  return rsi;
};

export const calculateMetrics = (trades: Trade[]): BacktestResult => {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profit > 0).length;
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  
  const profits = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
  const losses = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
  
  return {
    trades,
    totalProfit,
    winRate: (winningTrades / totalTrades) * 100,
    profitFactor: profits / losses,
    maxDrawdown: calculateMaxDrawdown(trades),
    sharpeRatio: calculateSharpeRatio(trades)
  };
}; 