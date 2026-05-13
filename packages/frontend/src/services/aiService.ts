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

const DEFAULT_TAX_DISCLAIMER =
  'Estimates only — not legal, tax, or investment advice. Confirm rules for your jurisdiction with a qualified professional.';

export interface TaxOptimizationResponse {
  suggestions: TaxSuggestion[];
  disclaimer: string;
  jurisdiction: string;
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
      const data = await res.json();
      if (Array.isArray(data)) {
        return data as ForecastData[];
      }
      if (data && typeof data === 'object' && typeof data.years5 === 'number') {
        const summary = typeof data.summary === 'string' ? data.summary : '';
        return [
          { year: 5, estimatedNetWorth: data.years5, confidence: 'medium', reasoning: summary },
          { year: 10, estimatedNetWorth: data.years10, confidence: 'medium', reasoning: summary },
          { year: 20, estimatedNetWorth: data.years20, confidence: 'medium', reasoning: summary },
        ];
      }
      return [];
    } catch (error) {
      console.error('AI Forecast error:', error);
      return [];
    }
  }

  async getTaxOptimizationSuggestions(
    spendingData: unknown,
    jurisdiction?: string
  ): Promise<TaxOptimizationResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/tax-suggestions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spendingData,
          ...(jurisdiction ? { jurisdiction } : {}),
        }),
      });
      if (!res.ok) throw new Error('Tax suggestions request failed');
      const data = await res.json();
      if (Array.isArray(data)) {
        return {
          suggestions: data as TaxSuggestion[],
          disclaimer: DEFAULT_TAX_DISCLAIMER,
          jurisdiction: 'UNSPECIFIED',
        };
      }
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      return {
        suggestions,
        disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : DEFAULT_TAX_DISCLAIMER,
        jurisdiction: typeof data.jurisdiction === 'string' ? data.jurisdiction : 'UNSPECIFIED',
      };
    } catch (error) {
      console.error('AI Tax Suggestion error:', error);
      return {
        suggestions: [],
        disclaimer: DEFAULT_TAX_DISCLAIMER,
        jurisdiction: 'UNSPECIFIED',
      };
    }
  }
}

export const aiService = new AIService();
