import { Router } from "express";

export const investmentRouter = Router();

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

investmentRouter.get("/stock/:symbol", async (req, res) => {
  const { symbol } = req.params;

  if (!ALPHA_VANTAGE_API_KEY) {
    return res.status(500).json({ error: "Alpha Vantage API key not configured" });
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    const data = await response.json();

    if (data["Global Quote"] && data["Global Quote"]["05. price"]) {
      const quote = data["Global Quote"];
      res.json({
        symbol: quote["01. symbol"],
        price: parseFloat(quote["05. price"]),
        change24h: parseFloat(quote["10. change percent"].replace("%", "")),
        lastUpdated: new Date().toISOString(),
      });
    } else if (data["Note"]) {
      res.status(429).json({ error: "API rate limit reached. Please try again later." });
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (error) {
    console.error("Alpha Vantage error:", error);
    res.status(500).json({ error: "Failed to fetch stock price" });
  }
});
