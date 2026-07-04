import json
import urllib.request

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Commodity-Market-Server")

# Yahoo Finance futures tickers for all 6 supported crops
TICKERS = {
    "corn": "ZC=F",
    "wheat": "ZW=F",
    "soybeans": "ZS=F",
    "cotton": "CT=F",
    "rice": "ZR=F",
    "sugarcane": "SB=F",  # Raw sugar futures as proxy for sugarcane
}

# Crop-specific metadata for unit conversion
# Yahoo returns prices in cents/pound (USX) for most, USD for rice
# We convert to USD per metric unit, then to local currency per quintal (100kg)
CROP_META = {
    "corn": {
        "ticker": "ZC=F",
        "raw_unit": "cents/bushel",
        "bushel_weight_kg": 25.401,   # 1 bushel corn = 25.4 kg
        "contract_size": 5000,         # 5000 bushels per contract
        "display_name": "Corn (Maize)",
    },
    "wheat": {
        "ticker": "ZW=F",
        "raw_unit": "cents/bushel",
        "bushel_weight_kg": 27.215,   # 1 bushel wheat = 27.2 kg
        "contract_size": 5000,
        "display_name": "Wheat",
    },
    "soybeans": {
        "ticker": "ZS=F",
        "raw_unit": "cents/bushel",
        "bushel_weight_kg": 27.215,   # 1 bushel soybeans = 27.2 kg
        "contract_size": 5000,
        "display_name": "Soybeans",
    },
    "cotton": {
        "ticker": "CT=F",
        "raw_unit": "cents/pound",
        "bushel_weight_kg": None,     # Cotton is priced per pound, not bushel
        "pound_to_kg": 0.4536,
        "contract_size": 50000,       # 50,000 pounds per contract
        "display_name": "Cotton",
    },
    "rice": {
        "ticker": "ZR=F",
        "raw_unit": "USD/cwt",        # Hundredweight = 100 lbs = 45.36 kg
        "cwt_weight_kg": 45.36,
        "contract_size": 2000,        # 2000 cwt per contract
        "display_name": "Rough Rice",
    },
    "sugarcane": {
        "ticker": "SB=F",
        "raw_unit": "cents/pound",
        "bushel_weight_kg": None,
        "pound_to_kg": 0.4536,
        "contract_size": 112000,      # 112,000 pounds (50 long tons)
        "display_name": "Raw Sugar (Sugarcane proxy)",
    },
}

# Exchange rates (updated at query time in production; static fallback here)
INR_PER_USD = 83.5
KES_PER_USD = 130.0


def _convert_to_usd_per_quintal(crop: str, raw_price: float) -> float:
    """Convert raw Yahoo Finance price to USD per quintal (100 kg).

    Each commodity has a different pricing unit:
    - Corn/Wheat/Soybeans: cents per bushel → divide by 100, then by bushel weight
    - Cotton/Sugar: cents per pound → divide by 100, then by pound-to-kg
    - Rice: USD per hundredweight (100 lbs = 45.36 kg)
    """
    meta = CROP_META.get(crop)
    if not meta:
        return 0.0

    raw_unit = meta["raw_unit"]

    if raw_unit == "cents/bushel":
        # Convert cents to USD, then bushel to kg, then scale to 100 kg (quintal)
        usd_per_bushel = raw_price / 100.0
        bushel_kg = meta["bushel_weight_kg"]
        usd_per_kg = usd_per_bushel / bushel_kg
        return round(usd_per_kg * 100.0, 2)

    elif raw_unit == "cents/pound":
        # Convert cents to USD, then pound to kg, then scale to 100 kg
        usd_per_pound = raw_price / 100.0
        pound_kg = meta["pound_to_kg"]
        usd_per_kg = usd_per_pound / pound_kg
        return round(usd_per_kg * 100.0, 2)

    elif raw_unit == "USD/cwt":
        # 1 cwt = 100 lbs = 45.36 kg; price is already in USD
        cwt_kg = meta["cwt_weight_kg"]
        usd_per_kg = raw_price / cwt_kg
        return round(usd_per_kg * 100.0, 2)

    return 0.0


@mcp.tool()
async def fetch_commodity_price(commodity: str) -> dict:
    """Fetch real-time commodity market prices and trend indicators for crops.

    Supports 6 crops: corn, wheat, soybeans, cotton, rice, sugarcane.
    Returns global futures prices (USD) and local estimates (INR for India, KES for Kenya).

    Args:
        commodity: Crop name (corn, wheat, soybeans, cotton, rice, sugarcane).
    """
    name = commodity.lower().strip()

    # Handle common aliases
    aliases = {"maize": "corn", "soy": "soybeans", "soya": "soybeans",
               "sugar": "sugarcane", "cane": "sugarcane"}
    name = aliases.get(name, name)

    if name not in CROP_META:
        supported = ", ".join(CROP_META.keys())
        return {"status": "error",
                "message": f"Unsupported commodity '{commodity}'. Supported: {supported}"}

    meta = CROP_META[name]
    ticker = meta["ticker"]

    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, timeout=5)
        data = json.loads(res.read().decode())

        chart_meta = data['chart']['result'][0]['meta']
        raw_price = chart_meta['regularMarketPrice']
        currency = chart_meta.get('currency', 'USX')

        prev_close = chart_meta.get('chartPreviousClose', raw_price)
        change_pct = round(((raw_price - prev_close) / prev_close) * 100, 2) if prev_close else 0.0
        trend = "up" if change_pct >= 0 else "down"

        # Convert to USD per quintal (100 kg) — the unit Indian/African farmers use
        usd_per_quintal = _convert_to_usd_per_quintal(name, raw_price)

        # Local currency conversions
        inr_per_quintal = round(usd_per_quintal * INR_PER_USD, 0)
        kes_per_quintal = round(usd_per_quintal * KES_PER_USD, 0)

        return {
            "commodity": name,
            "display_name": meta["display_name"],
            "global_futures_price": raw_price,
            "global_futures_unit": meta["raw_unit"],
            "ticker": ticker,
            "currency": currency,
            "usd_per_quintal": usd_per_quintal,
            "change_percent": change_pct,
            "trend": trend,
            "local_market_estimates": {
                "india_inr_per_quintal": inr_per_quintal,
                "kenya_kes_per_quintal": kes_per_quintal,
            },
            "note": "Global futures price converted to local currency. Actual mandi prices may vary. Set DATA_GOV_IN_API_KEY for real Indian mandi prices.",
            "source": "Yahoo Finance Real-Time Futures + Currency Conversion",
        }

    except Exception as e:
        # Fallback rates (approximate USD per quintal)
        fallback_usd = {
            "corn": 17.36, "wheat": 22.04, "soybeans": 42.15,
            "cotton": 171.05, "rice": 29.35, "sugarcane": 32.72,
        }
        usd_q = fallback_usd.get(name, 20.0)
        return {
            "commodity": name,
            "display_name": meta["display_name"],
            "usd_per_quintal": usd_q,
            "local_market_estimates": {
                "india_inr_per_quintal": round(usd_q * INR_PER_USD, 0),
                "kenya_kes_per_quintal": round(usd_q * KES_PER_USD, 0),
            },
            "trend": "stable",
            "note": f"Fallback estimated rates (Yahoo Finance API error: {e})",
            "source": "Fallback Estimate",
        }


@mcp.tool()
async def fetch_mandi_prices(region: str, commodity: str = "") -> dict:
    """Fetch local mandi (market) prices for a specific region and optional commodity.

    Uses data.gov.in API for Indian mandi prices if DATA_GOV_IN_API_KEY is set.
    Falls back to Yahoo Finance currency conversion otherwise.
    For African regions, uses Yahoo Finance + KES conversion.

    Args:
        region: Market region name (e.g., 'Nagpur', 'Pune', 'Nakuru').
        commodity: Optional crop filter (e.g., 'cotton', 'wheat').
    """
    import os

    region_str = (region or "").strip()
    is_africa = any(a in region_str.lower() for a in
                    ["eldoret", "nakuru", "kenya", "nairobi", "tanzania", "uganda", "nigeria", "ghana"])

    # --- Attempt 1: data.gov.in API for Indian mandi prices ---
    api_key = os.environ.get("DATA_GOV_IN_API_KEY", "")
    if api_key and not is_africa:
        try:
            import urllib.parse as url_parse
            base_url = "https://api.data.gov.in/resource/9ef8423d-2997-4601-abef-1a8b0dca3b8c"
            params = {
                "api-key": api_key,
                "format": "json",
                "limit": "20",
            }
            if commodity:
                # Map commodity names to data.gov.in format
                crop_map = {
                    "corn": "Maize", "wheat": "Wheat", "soybeans": "Soyabean",
                    "cotton": "Cotton", "rice": "Rice", "sugarcane": "Sugarcane",
                }
                crop_name = crop_map.get(commodity.lower().strip(), commodity.title())
                params["filters[commodity]"] = crop_name
            if region_str:
                params["filters[state]"] = region_str.title()

            query = "&".join(f"{k}={url_parse.quote(str(v))}" for k, v in params.items())
            mandi_url = f"{base_url}?{query}"
            req = urllib.request.Request(mandi_url, headers={'User-Agent': 'Mozilla/5.0'})
            res = urllib.request.urlopen(req, timeout=8)
            mandi_data = json.loads(res.read().decode())

            if isinstance(mandi_data, list) and len(mandi_data) > 0:
                prices = {}
                for entry in mandi_data[:10]:
                    crop = entry.get("commodity", "").lower().strip()
                    price_str = entry.get("modal_price", "0")
                    market = entry.get("market", "")
                    try:
                        price_val = int(float(price_str))
                        if crop and price_val > 0:
                            prices[crop] = f"₹{price_val:,}/quintal"
                    except (ValueError, TypeError):
                        continue

                if prices:
                    return {
                        "region": region_str,
                        "source": "data.gov.in Mandi API (real-time)",
                        "market": mandi_data[0].get("market", region_str),
                        "prices": prices,
                        "total_results": len(mandi_data),
                    }
        except Exception as e:
            print(f"Warning: data.gov.in API failed ({e}). Using Yahoo Finance conversion.")

    # --- Attempt 2: Yahoo Finance futures → local currency conversion ---
    currency = "KES" if is_africa else "INR"
    fx_rate = KES_PER_USD if is_africa else INR_PER_USD
    symbol = "KES" if is_africa else "₹"
    unit = "bag" if is_africa else "quintal"

    prices = {}
    crops_to_fetch = [commodity.lower().strip()] if commodity else list(CROP_META.keys())
    aliases = {"maize": "corn", "soy": "soybeans", "soya": "soybeans",
               "sugar": "sugarcane", "cane": "sugarcane"}
    crops_to_fetch = [aliases.get(c, c) for c in crops_to_fetch if c]

    for crop in crops_to_fetch:
        if crop not in CROP_META:
            continue
        try:
            ticker = CROP_META[crop]["ticker"]
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            res = urllib.request.urlopen(req, timeout=5)
            data = json.loads(res.read().decode())
            raw_price = data['chart']['result'][0]['meta']['regularMarketPrice']
            usd_q = _convert_to_usd_per_quintal(crop, raw_price)
            local_price = round(usd_q * fx_rate, 0)
            prices[crop] = f"{symbol}{int(local_price):,}/{unit}"
        except Exception:
            fallback = {"corn": 1450, "wheat": 1842, "soybeans": 3521,
                        "cotton": 14273, "rice": 2449, "sugarcane": 2731}
            if not is_africa:
                prices[crop] = f"{symbol}{fallback.get(crop, 2000):,}/{unit}"
            else:
                prices[crop] = f"{symbol}{round(fallback.get(crop, 2000) * KES_PER_USD / INR_PER_USD):,}/{unit}"

    return {
        "region": region_str,
        "source": "Yahoo Finance Futures + Currency Conversion",
        "currency": currency,
        "prices": prices,
        "note": "Set DATA_GOV_IN_API_KEY for real Indian mandi prices." if not is_africa else "",
    }
