import json
import os
import urllib.request

import yaml

SCHEMAS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ui/schemas"))
OKF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../okf"))


def refresh_market_schema() -> str:
    """Fetch live Yahoo Finance prices and update the market insights schema."""
    schema_path = os.path.join(SCHEMAS_DIR, "market_insights.json")
    if not os.path.exists(schema_path):
        return f"Error: market_insights.json schema not found at {schema_path}."

    try:
        with open(schema_path, encoding="utf-8") as f:
            schema = json.load(f)
    except Exception as e:
        return f"Error reading market_insights.json: {e}"

    prices = {"corn": 4.50, "wheat": 6.12, "soybeans": 11.20}
    headers = {'User-Agent': 'Mozilla/5.0'}
    for crop, ticker in [("corn", "ZC=F"), ("wheat", "ZW=F"), ("soybeans", "ZS=F")]:
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
            req = urllib.request.Request(url, headers=headers)
            res = urllib.request.urlopen(req, timeout=3)
            data = json.loads(res.read().decode())
            raw_price = data['chart']['result'][0]['meta']['regularMarketPrice']
            prices[crop] = round(raw_price / 100.0, 2)
        except Exception as e:
            print(f"Warning: Failed to fetch pricing for {crop} ({e}). Using base rate.")

    for comp in schema.get("components", []):
        if comp.get("type") == "grid":
            for item in comp.get("items", []):
                label = item.get("label", "").lower()
                if "corn" in label:
                    item["value"] = f"${prices['corn']}"
                elif "wheat" in label:
                    item["value"] = f"${prices['wheat']}"
                elif "soy" in label:
                    item["value"] = f"${prices['soybeans']}"

    try:
        with open(schema_path, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2)
        return f"Successfully updated market_insights schema with live prices: Corn=${prices['corn']}, Wheat=${prices['wheat']}, Soy=${prices['soybeans']}"
    except Exception as e:
        return f"Error saving market_insights.json: {e}"


def refresh_crop_schema() -> str:
    """Read OKF nutrient concepts and local weather to update crop health schema."""
    schema_path = os.path.join(SCHEMAS_DIR, "crop_dashboard.json")
    if not os.path.exists(schema_path):
        return f"Error: crop_dashboard.json schema not found at {schema_path}."

    try:
        with open(schema_path, encoding="utf-8") as f:
            schema = json.load(f)
    except Exception as e:
        return f"Error reading crop_dashboard.json: {e}"

    nitrogen_ppm = "40-60"
    nutrient_path = os.path.join(OKF_DIR, "soil/nutrients/nitrogen.md")
    if os.path.exists(nutrient_path):
        try:
            with open(nutrient_path, encoding="utf-8") as f:
                content = f.read()
            if "---" in content:
                parts = content.split("---", 2)
                meta = yaml.safe_load(parts[1])
                nitrogen_ppm = str(meta.get("properties", {}).get("optimal_ppm", nitrogen_ppm))
        except Exception as e:
            print(f"Warning: Failed to parse nutrient concept ({e}).")

    temp_c = "22°C"
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&current_weather=true"
        res = urllib.request.urlopen(url, timeout=3)
        data = json.loads(res.read().decode())
        temp_c = f"{round(data['current_weather']['temperature'])}°C"
    except Exception as e:
        print(f"Warning: Failed to fetch live weather temp ({e}).")

    for comp in schema.get("components", []):
        if comp.get("type") == "grid":
            for item in comp.get("items", []):
                label = item.get("label", "").lower()
                if "temp" in label:
                    item["value"] = temp_c
        elif comp.get("type") == "chart":
            comp["label"] = f"NPK Nutrient Levels (N Target: {nitrogen_ppm} PPM)"

    try:
        with open(schema_path, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2)
        return f"Successfully updated crop_dashboard schema. Temperature={temp_c}, N Target={nitrogen_ppm} PPM"
    except Exception as e:
        return f"Error saving crop_dashboard.json: {e}"


def get_ui_schema(schema_name: str) -> str:
    """Read a declarative UI schema template from disk.

    Args:
        schema_name: The name of the schema file without extension (e.g. 'crop_dashboard', 'irrigation_planner', 'market_insights', 'pest_alert', 'simulation', 'voice_interface').
    """
    schema_name = os.path.basename(schema_name)
    if not schema_name.endswith(".json"):
        schema_path = os.path.join(SCHEMAS_DIR, f"{schema_name}.json")
    else:
        schema_path = os.path.join(SCHEMAS_DIR, schema_name)

    if not os.path.exists(schema_path):
        return f"Error: UI schema '{schema_name}' not found."

    try:
        with open(schema_path, encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading UI schema '{schema_name}': {e}"


def get_local_mandi_prices(region: str) -> dict:
    """Retrieve localized mandi commodity prices for the farmer's region.

    Delegates to the market MCP server's fetch_mandi_prices tool which:
    1. Uses data.gov.in API for real Indian mandi prices (if DATA_GOV_IN_API_KEY set)
    2. Falls back to Yahoo Finance futures + currency conversion (INR/KES)

    Args:
        region: The district or mandi region (e.g. 'Nagpur', 'Pune', 'Eldoret', 'Nakuru').

    Returns:
        dict: Localized crop prices in the farmer's local currency.
    """
    import asyncio as _asyncio
    from mcp_servers.market.server import fetch_mandi_prices
    try:
        result = _asyncio.run(fetch_mandi_prices(region))
        return result
    except Exception as e:
        return {"region": region, "source": f"Error: {e}", "prices": {}}

