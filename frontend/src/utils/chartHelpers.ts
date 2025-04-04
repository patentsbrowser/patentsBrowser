export const calculateMA = (data: ChartData[], period: number) => {
  const ma = new Array(data.length).fill(0);
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    ma[i] = sum / period;
  }
  
  return ma;
};

export const calculateRSI = (data: ChartData[], period: number) => {
  const rsi = new Array(data.length).fill(0);
  let gains = 0;
  let losses = 0;

  // Calculate initial RSI
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate RSI for remaining periods
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    
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

export const calculateBollingerBands = (data: ChartData[], period: number, stdDev: number) => {
  const ma = calculateMA(data, period);
  const upper = new Array(data.length).fill(0);
  const lower = new Array(data.length).fill(0);

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(data[i - j].close - ma[i], 2);
    }
    const std = Math.sqrt(sum / period);
    upper[i] = ma[i] + (std * stdDev);
    lower[i] = ma[i] - (std * stdDev);
  }

  return { upper, lower, middle: ma };
}; 