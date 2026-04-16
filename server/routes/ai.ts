import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

router.post("/insights", async (req, res) => {
  try {
    const { transactions, selectedBank } = req.body;
    
    const prompt = `Based on these transactions: ${JSON.stringify(transactions)}, generate 4 personalized financial insights. 
    ${selectedBank !== 'ALL' ? `Focus specifically on transactions related to the account: ${selectedBank}.` : ''}
    Return them as a JSON array of objects with fields: id (string), type ('ALERT' | 'WIN' | 'TIP' | 'TREND'), title (string), description (string), date (string like '2h ago').
    Focus on spending patterns, potential savings, and wealth building.`;

    const result = await (genAI as any).models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const text = result.text;
    
    const cleanedText = text.replace(/```json|```/g, '').trim();
    const parsedInsights = JSON.parse(cleanedText);
    
    res.json(parsedInsights);
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message, history, transactions } = req.body;
    
    const systemInstruction = "You are the Arta Oracle, a premium financial AI. You have access to real-time transaction data. Always be professional, insightful, and proactive. User context: The user's name is Yugandhar. Current financial data is provided in the context.";

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      {
        role: 'user',
        parts: [{ text: `Context: ${JSON.stringify(transactions)}\n\nUser message: ${message}` }]
      }
    ];

    const result = await (genAI as any).models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction
      }
    });
    
    res.json({ content: result.text });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as aiRouter };
