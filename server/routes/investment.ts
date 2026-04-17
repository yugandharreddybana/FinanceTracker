import { Router } from "express";

export const investmentRouter = Router();

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// NSE mock prices in INR for when no API key is configured
const NSE_MOCK: Record<string, { price: number; change: number }> = {
  RELIANCE:   { price: 2921.45,  change: 1.2  },
  TCS:        { price: 3712.80,  change: -0.5 },
  INFY:       { price: 1689.30,  change: 0.8  },
  HDFCBANK:   { price: 1723.55,  change: 1.5  },
  ICICIBANK:  { price: 1301.20,  change: -1.1 },
  WIPRO:      { price: 293.75,   change: 0.6  },
  TATAMOTORS: { price: 913.60,   change: 2.3  },
  BAJFINANCE: { price: 6812.40,  change: -0.9 },
  SBIN:       { price: 782.15,   change: 1.8  },
  AXISBANK:   { price: 1098.90,  change: 0.4  },
  KOTAKBANK:  { price: 1756.70,  change: -0.3 },
  MARUTI:     { price: 11842.30, change: 1.1  },
  SUNPHARMA:  { price: 1612.45,  change: 0.7  },
  HCLTECH:    { price: 1823.60,  change: -0.6 },
  LT:         { price: 3789.20,  change: 1.4  },
  TATASTEEL:  { price: 154.30,   change: 2.1  },
  ITC:        { price: 455.60,   change: 0.9  },
  NIFTYBEES:  { price: 248.40,   change: 0.5  },
  BANKBEES:   { price: 521.30,   change: 1.0  },
};

investmentRouter.get("/stock/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const upper = symbol.toUpperCase();

  // If no API key, return INR mock data for known NSE stocks
  if (!ALPHA_VANTAGE_API_KEY) {
    const mock = NSE_MOCK[upper];
    if (mock) {
      const variation = (Math.random() - 0.5) * mock.price * 0.002;
      return res.json({
        symbol: upper,
        price: Math.max(0, mock.price + variation),
        change24h: mock.change,
        lastUpdated: new Date().toISOString(),
        currency: "INR",
      });
    }
    return res.status(404).json({ error: "Stock not found in local data. Configure ALPHA_VANTAGE_API_KEY for live prices." });
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

