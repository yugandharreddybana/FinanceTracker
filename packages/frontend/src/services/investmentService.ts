export interface AssetPrice {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

import { MIDDLEWARE_BASE } from './api';

// Popular NSE stocks with approximate INR prices (Cleared for production)
const NSE_MOCK_PRICES: Record<string, AssetPrice> = {};

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
  private prices: Record<string, AssetPrice> = {};

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
    
    return {};
  }

  async getStockPrice(symbol: string): Promise<AssetPrice | null> {
    // Check local cache first
    if (this.prices[symbol.toUpperCase()]) {
      return this.prices[symbol.toUpperCase()];
    }

    // Attempt to fetch from backend API
    try {
      const response = await fetch(`${MIDDLEWARE_BASE}/api/investment/stock/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        this.prices[symbol.toUpperCase()] = data;
        return data;
      }
    } catch (error) {
      console.error(`Failed to fetch stock price for ${symbol}:`, error);
    }

    return null;
  }
}

export const investmentService = new InvestmentService();
