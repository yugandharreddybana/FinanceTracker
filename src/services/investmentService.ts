export interface AssetPrice {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

// Popular NSE stocks with approximate INR prices
const NSE_MOCK_PRICES: Record<string, AssetPrice> = {
  'RELIANCE':    { symbol: 'RELIANCE',    price: 2921.45,  change24h: 1.2,  lastUpdated: new Date().toISOString() },
  'TCS':         { symbol: 'TCS',         price: 3712.80,  change24h: -0.5, lastUpdated: new Date().toISOString() },
  'INFY':        { symbol: 'INFY',        price: 1689.30,  change24h: 0.8,  lastUpdated: new Date().toISOString() },
  'HDFCBANK':    { symbol: 'HDFCBANK',    price: 1723.55,  change24h: 1.5,  lastUpdated: new Date().toISOString() },
  'ICICIBANK':   { symbol: 'ICICIBANK',   price: 1301.20,  change24h: -1.1, lastUpdated: new Date().toISOString() },
  'WIPRO':       { symbol: 'WIPRO',       price: 293.75,   change24h: 0.6,  lastUpdated: new Date().toISOString() },
  'TATAMOTORS':  { symbol: 'TATAMOTORS',  price: 913.60,   change24h: 2.3,  lastUpdated: new Date().toISOString() },
  'BAJFINANCE':  { symbol: 'BAJFINANCE',  price: 6812.40,  change24h: -0.9, lastUpdated: new Date().toISOString() },
  'SBIN':        { symbol: 'SBIN',        price: 782.15,   change24h: 1.8,  lastUpdated: new Date().toISOString() },
  'AXISBANK':    { symbol: 'AXISBANK',    price: 1098.90,  change24h: 0.4,  lastUpdated: new Date().toISOString() },
  'KOTAKBANK':   { symbol: 'KOTAKBANK',   price: 1756.70,  change24h: -0.3, lastUpdated: new Date().toISOString() },
  'MARUTI':      { symbol: 'MARUTI',      price: 11842.30, change24h: 1.1,  lastUpdated: new Date().toISOString() },
  'SUNPHARMA':   { symbol: 'SUNPHARMA',   price: 1612.45,  change24h: 0.7,  lastUpdated: new Date().toISOString() },
  'HCLTECH':     { symbol: 'HCLTECH',     price: 1823.60,  change24h: -0.6, lastUpdated: new Date().toISOString() },
  'LT':          { symbol: 'LT',          price: 3789.20,  change24h: 1.4,  lastUpdated: new Date().toISOString() },
  'TATASTEEL':   { symbol: 'TATASTEEL',   price: 154.30,   change24h: 2.1,  lastUpdated: new Date().toISOString() },
  'HINDUNILVR':  { symbol: 'HINDUNILVR',  price: 2421.85,  change24h: 0.2,  lastUpdated: new Date().toISOString() },
  'ITC':         { symbol: 'ITC',         price: 455.60,   change24h: 0.9,  lastUpdated: new Date().toISOString() },
  'ADANIPORTS':  { symbol: 'ADANIPORTS',  price: 1289.75,  change24h: -1.7, lastUpdated: new Date().toISOString() },
  'NIFTYBEES':   { symbol: 'NIFTYBEES',   price: 248.40,   change24h: 0.5,  lastUpdated: new Date().toISOString() },
  'BANKBEES':    { symbol: 'BANKBEES',    price: 521.30,   change24h: 1.0,  lastUpdated: new Date().toISOString() },
  // Crypto mock prices in INR (fallback)
  'BTC':  { symbol: 'BTC',  price: 8821450,  change24h: 2.5,  lastUpdated: new Date().toISOString() },
  'ETH':  { symbol: 'ETH',  price: 293870,   change24h: -1.2, lastUpdated: new Date().toISOString() },
  'SOL':  { symbol: 'SOL',  price: 16240,    change24h: 3.8,  lastUpdated: new Date().toISOString() },
  'ADA':  { symbol: 'ADA',  price: 73.40,    change24h: -0.8, lastUpdated: new Date().toISOString() },
  'DOT':  { symbol: 'DOT',  price: 682.90,   change24h: 1.6,  lastUpdated: new Date().toISOString() },
  'AVAX': { symbol: 'AVAX', price: 3187.50,  change24h: -2.1, lastUpdated: new Date().toISOString() },
  'MATIC':{ symbol: 'MATIC',price: 58.20,    change24h: 4.2,  lastUpdated: new Date().toISOString() },
  'DOGE': { symbol: 'DOGE', price: 13.85,    change24h: 5.1,  lastUpdated: new Date().toISOString() },
};

// Popular NSE stocks for suggestions in the UI
export const NSE_POPULAR_STOCKS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries',     type: 'Stock' as const },
  { symbol: 'TCS',        name: 'Tata Consultancy Services',type: 'Stock' as const },
  { symbol: 'INFY',       name: 'Infosys',                  type: 'Stock' as const },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank',                type: 'Stock' as const },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank',               type: 'Stock' as const },
  { symbol: 'WIPRO',      name: 'Wipro',                    type: 'Stock' as const },
  { symbol: 'TATAMOTORS', name: 'Tata Motors',              type: 'Stock' as const },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance',            type: 'Stock' as const },
  { symbol: 'SBIN',       name: 'State Bank of India',      type: 'Stock' as const },
  { symbol: 'AXISBANK',   name: 'Axis Bank',                type: 'Stock' as const },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank',      type: 'Stock' as const },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki',            type: 'Stock' as const },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical',       type: 'Stock' as const },
  { symbol: 'HCLTECH',    name: 'HCL Technologies',         type: 'Stock' as const },
  { symbol: 'LT',         name: 'Larsen & Toubro',          type: 'Stock' as const },
  { symbol: 'ITC',        name: 'ITC Limited',              type: 'Stock' as const },
  { symbol: 'NIFTYBEES',  name: 'Nippon India Nifty 50 ETF',type: 'ETF'   as const },
  { symbol: 'BANKBEES',   name: 'Nippon India Banking ETF', type: 'ETF'   as const },
];

export const CRYPTO_ID_MAP: Record<string, string> = {
  'BTC':  'bitcoin',
  'ETH':  'ethereum',
  'SOL':  'solana',
  'ADA':  'cardano',
  'DOT':  'polkadot',
  'AVAX': 'avalanche-2',
  'MATIC':'matic-network',
  'DOGE': 'dogecoin',
};

class InvestmentService {
  private prices: Record<string, AssetPrice> = { ...NSE_MOCK_PRICES };

  async getCryptoPrices(ids: string[] = ['bitcoin', 'ethereum', 'solana']): Promise<Record<string, AssetPrice>> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=inr&include_24hr_change=true`
      );
      if (response.ok) {
        const data = await response.json();
        const updatedPrices: Record<string, AssetPrice> = {};
        const symbolMap: Record<string, string> = {
          'bitcoin':      'BTC',
          'ethereum':     'ETH',
          'solana':       'SOL',
          'cardano':      'ADA',
          'polkadot':     'DOT',
          'avalanche-2':  'AVAX',
          'matic-network':'MATIC',
          'dogecoin':     'DOGE',
        };

        Object.keys(data).forEach(id => {
          const symbol = symbolMap[id] ?? id.toUpperCase();
          updatedPrices[symbol] = {
            symbol,
            price: data[id].inr,
            change24h: data[id].inr_24h_change ?? 0,
            lastUpdated: new Date().toISOString(),
          };
        });

        this.prices = { ...this.prices, ...updatedPrices };
        return updatedPrices;
      }
    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);
    }
    // Return mock INR prices as fallback
    const fallback: Record<string, AssetPrice> = {};
    for (const id of ids) {
      const symbolMap: Record<string, string> = {
        'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL',
        'cardano': 'ADA', 'polkadot': 'DOT', 'avalanche-2': 'AVAX',
        'matic-network': 'MATIC', 'dogecoin': 'DOGE',
      };
      const sym = symbolMap[id] ?? id.toUpperCase();
      if (this.prices[sym]) fallback[sym] = this.prices[sym];
    }
    return fallback;
  }

  async getStockPrice(symbol: string): Promise<AssetPrice | null> {
    // Return mock INR price immediately for known NSE stocks
    const mockPrice = NSE_MOCK_PRICES[symbol.toUpperCase()];
    if (mockPrice) {
      // Simulate small real-time variation
      const variation = (Math.random() - 0.5) * (mockPrice.price * 0.002);
      const updated: AssetPrice = {
        ...mockPrice,
        price: Math.max(0, mockPrice.price + variation),
        lastUpdated: new Date().toISOString(),
      };
      this.prices[symbol.toUpperCase()] = updated;
      return updated;
    }

    // Try the backend API as fallback for unknown symbols
    try {
      const response = await fetch(`http://localhost:4000/api/investment/stock/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        this.prices[symbol] = data;
        return data;
      }
    } catch (error) {
      console.error(`Failed to fetch stock price for ${symbol}:`, error);
    }

    return null;
  }
}

export const investmentService = new InvestmentService();
