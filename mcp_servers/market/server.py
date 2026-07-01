import urllib.request
import json
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Commodity-Market-Server")

TICKERS = {
    "corn": "ZC=F",
    "wheat": "ZW=F",
    "soybeans": "ZS=F"
}

@mcp.tool()
async def fetch_commodity_price(commodity: str) -> dict:
    """Fetch commodity market rates and trend indicators for crops.

    Args:
        commodity: Crop name (corn, wheat, soybeans).
    """
    name = commodity.lower().strip()
    if name not in TICKERS:
        return {"status": "error", "message": f"Unsupported commodity '{commodity}'. Use corn, wheat, or soybeans."}
        
    ticker = TICKERS[name]
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, timeout=5)
        data = json.loads(res.read().decode())
        
        meta = data['chart']['result'][0]['meta']
        raw_price = meta['regularMarketPrice']
        
        usd_price = round(raw_price / 100.0, 2)
        
        prev_close = meta.get('chartPreviousClose', raw_price)
        change_pct = round(((raw_price - prev_close) / prev_close) * 100, 2)
        trend = "up" if change_pct >= 0 else "down"
        
        # Local Conversions for Indian (INR) and East African (KES) farmers
        inr_per_usd = 83.5
        kes_per_usd = 130.0
        # Bushel to Metric Quintal (100 kg) conversion factors
        bushel_weights = {
            "corn": 0.254,      # 25.4 kg per bushel
            "wheat": 0.272,     # 27.21 kg per bushel
            "soybeans": 0.272   # 27.21 kg per bushel
        }
        weight_factor = bushel_weights.get(name, 0.27)
        price_inr_quintal = round((usd_price / weight_factor) * inr_per_usd, 0)
        price_kes_quintal = round((usd_price / weight_factor) * kes_per_usd, 0)
        
        return {
            "commodity": name,
            "price_usd": usd_price,
            "unit": "bushel",
            "ticker": ticker,
            "change_percent": change_pct,
            "trend": trend,
            "local_market_estimates": {
                "india_inr_per_quintal": price_inr_quintal,
                "kenya_kes_per_quintal": price_kes_quintal
            },
            "source": "Yahoo Finance Real-Time Futures & Local Conversion Engine"
        }
    except Exception as e:
        fallback_rates = {"corn": 4.50, "wheat": 6.12, "soybeans": 11.20}
        return {
            "commodity": name,
            "price_usd": fallback_rates[name],
            "unit": "bushel",
            "note": f"Fallback simulated rates (Real API error: {e})",
            "trend": "up"
        }
