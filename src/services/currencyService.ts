export interface ExchangeRates {
  [key: string]: number;
}

class CurrencyService {
  private rates: ExchangeRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.6,
    AUD: 1.52,
    CAD: 1.35,
    INR: 83.3,
  };

  async fetchLatestRates(base: string = 'USD'): Promise<ExchangeRates> {
    try {
      // In a real app, we would call an API like ExchangeRate-API or Fixer.io
      // For this demo, we'll simulate a fetch with slight variations
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      if (response.ok) {
        const data = await response.json();
        this.rates = data.rates;
        return data.rates;
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    }
    return this.rates;
  }

  convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;
    const baseAmount = amount / (this.rates[from] || 1);
    return baseAmount * (this.rates[to] || 1);
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

export const currencyService = new CurrencyService();
