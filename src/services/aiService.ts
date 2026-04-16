import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  async getNetWorthForecast(currentNetWorth: number, monthlySavings: number, riskProfile: string): Promise<ForecastData[]> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Given a current net worth of ${currentNetWorth}, monthly savings of ${monthlySavings}, and a risk profile of ${riskProfile}, provide a net worth forecast for 5, 10, and 20 years. Consider average inflation (3%) and historical market returns. Return as JSON array of objects with keys: year, estimatedNetWorth, confidence, reasoning.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.INTEGER },
                estimatedNetWorth: { type: Type.NUMBER },
                confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                reasoning: { type: Type.STRING }
              },
              required: ['year', 'estimatedNetWorth', 'confidence', 'reasoning']
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error('AI Forecast error:', error);
      return [];
    }
  }

  async getTaxOptimizationSuggestions(spendingData: any): Promise<TaxSuggestion[]> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze this spending data and provide 3-5 tax optimization suggestions. Return as JSON array of objects with keys: title, description, potentialSavings, difficulty. Data: ${JSON.stringify(spendingData)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                potentialSavings: { type: Type.NUMBER },
                difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
              },
              required: ['title', 'description', 'potentialSavings', 'difficulty']
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error('AI Tax Suggestion error:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
