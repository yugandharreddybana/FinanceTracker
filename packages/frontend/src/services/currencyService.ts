export interface ExchangeRates {
  [key: string]: number;
}

class CurrencyService {
  private rates: ExchangeRates = {
    EUR: 1,
    INR: 90.5,
  };

  async fetchLatestRates(base: string = 'EUR'): Promise<ExchangeRates> {
    try {
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
    const fromRate = this.rates[from];
    const toRate = this.rates[to];
    if (typeof fromRate !== 'number' || typeof toRate !== 'number' || !Number.isFinite(fromRate) || !Number.isFinite(toRate)) {
      return amount;
    }
    const baseAmount = amount / fromRate;
    return baseAmount * toRate;
  }

  formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'EUR',
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
}

export const currencyService = new CurrencyService();
