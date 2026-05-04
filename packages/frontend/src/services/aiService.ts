import { MIDDLEWARE_BASE } from './api';

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
  steps?: string[];
}

export interface AIInsight {
  id: string;
  type: 'ALERT' | 'WIN' | 'TIP' | 'TREND';
  title: string;
  description: string;
  date: string;
}

class AIService {
  private get baseUrl() {
    return `${MIDDLEWARE_BASE}/api/ai`;
  }

  async getInsights(transactions: any[], selectedBank: string = 'ALL'): Promise<AIInsight[]> {
    try {
      const res = await fetch(`${this.baseUrl}/insights`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, selectedBank }),
      });
      if (!res.ok) throw new Error('Insights request failed');
      return res.json();
    } catch (error) {
      console.error('AI Insights error:', error);
      return [];
    }
  }

  async getNetWorthForecast(currentNetWorth: number, monthlySavings: number, riskProfile: string): Promise<ForecastData[]> {
    try {
      const res = await fetch(`${this.baseUrl}/forecast`, {
        method: 'POST',
        credentials: 'include',
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
        credentials: 'include',
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
