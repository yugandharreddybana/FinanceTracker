export interface ForecastData {
  year: number;
  estimatedNetWorth: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface TaxSuggestion {
  title: string;
  description: string;
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

class AIService {
  private readonly baseUrl = '/api/ai';

  async getNetWorthForecast(currentNetWorth: number, monthlySavings: number, riskProfile: string): Promise<ForecastData[]> {
    try {
      const res = await fetch(`${this.baseUrl}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentNetWorth, monthlySavings, riskProfile }),
      });
      if (!res.ok) throw new Error('Forecast request failed');
      return res.json();
    } catch (error) {
      console.error('AI Forecast error:', error);
      return [];
    }
  }

  async getTaxOptimizationSuggestions(spendingData: any): Promise<TaxSuggestion[]> {
    try {
      const res = await fetch(`${this.baseUrl}/tax-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spendingData }),
      });
      if (!res.ok) throw new Error('Tax suggestions request failed');
      return res.json();
    } catch (error) {
      console.error('AI Tax Suggestion error:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
