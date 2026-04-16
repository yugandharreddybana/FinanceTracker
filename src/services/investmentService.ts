export interface AssetPrice {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

class InvestmentService {
  // Mock data for initial load
  private prices: Record<string, AssetPrice> = {
    'BTC': { symbol: 'BTC', price: 65432.10, change24h: 2.5, lastUpdated: new Date().toISOString() },
    'ETH': { symbol: 'ETH', price: 3456.78, change24h: -1.2, lastUpdated: new Date().toISOString() },
    'AAPL': { symbol: 'AAPL', price: 185.92, change24h: 0.8, lastUpdated: new Date().toISOString() },
    'TSLA': { symbol: 'TSLA', price: 175.45, change24h: -3.4, lastUpdated: new Date().toISOString() },
    'VOO': { symbol: 'VOO', price: 478.12, change24h: 0.5, lastUpdated: new Date().toISOString() },
  };

  async getCryptoPrices(ids: string[] = ['bitcoin', 'ethereum', 'solana']): Promise<Record<string, AssetPrice>> {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
      if (response.ok) {
        const data = await response.json();
        const updatedPrices: Record<string, AssetPrice> = {};
        
        Object.keys(data).forEach(id => {
          const symbol = id === 'bitcoin' ? 'BTC' : id === 'ethereum' ? 'ETH' : id.toUpperCase();
          updatedPrices[symbol] = {
            symbol,
            price: data[id].usd,
            change24h: data[id].usd_24h_change,
            lastUpdated: new Date().toISOString()
          };
        });
        
        this.prices = { ...this.prices, ...updatedPrices };
        return updatedPrices;
      }
    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);
    }
    return this.prices;
  }

  async getStockPrice(symbol: string): Promise<AssetPrice | null> {
    try {
      const response = await fetch(`/api/investment/stock/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        this.prices[symbol] = data;
        return data;
      }
    } catch (error) {
      console.error(`Failed to fetch stock price for ${symbol}:`, error);
    }

    // Fallback to mock data if API fails or is not configured
    const current = this.prices[symbol];
    if (current) {
      const variation = (Math.random() - 0.5) * 2;
      return {
        ...current,
        price: current.price + variation,
        lastUpdated: new Date().toISOString()
      };
    }
    return null;
  }
}

export const investmentService = new InvestmentService();
