---
id: pesticide_limits
type: SafetyRule
name: Pesticide Dosage Limits
description: Maximum safe application rates for common agricultural pesticides in India and Africa
---

# Pesticide Dosage Limits

## Overview
These limits define the maximum safe concentration and application rates for common pesticides. Exceeding these limits can cause crop damage, residue issues, and health risks.

## Safety Kernel Rules

| Pesticide | Max Concentration | Max Application Rate | Pre-Harvest Interval | Notes |
|-----------|------------------|---------------------|---------------------|-------|
| Carbendazim | 1 g/liter | 2.5 L/hectare | 14 days | Fungicide for rust, blight |
| Copper sulfate | 2 g/liter | 1.5 L/hectare | 7 days | Fungicide, broad-spectrum |
| Chlorpyriphos | 0.5 ml/liter | 1.0 L/hectare | 21 days | Organophosphate insecticide |
| Malathion | 1.0 ml/liter | 2.0 L/hectare | 14 days | Insecticide for sucking pests |
| Neem oil | 5 ml/liter | 3.0 L/hectare | 0 days | Organic, safe for all stages |
| Bordeaux mixture | 10 g/liter | 2.0 L/hectare | 7 days | Copper-based fungicide |
| Mancozeb | 2.5 g/liter | 2.0 L/hectare | 14 days | Fungicide for early blight |
| Imidacloprid | 0.3 ml/liter | 0.5 L/hectare | 21 days | Systemic insecticide |
| Lambda-cyhalothrin | 0.25 ml/liter | 0.5 L/hectare | 14 days | Pyrethroid insecticide |
| Rotenone | 1.0 g/liter | 1.5 L/hectare | 0 days | Organic insecticide |

## Safety Precautions

1. **Always wear protective gear** (gloves, mask, coveralls) during application
2. **Apply during cool hours** (early morning or late evening)
3. **Do not apply during strong winds** (drift risk)
4. **Do not mix pesticides** unless label explicitly allows it
5. **Follow pre-harvest intervals** — do not harvest before the interval
6. **Store in original containers** in locked, ventilated area
7. **Dispose of empty containers** by triple-rinsing and puncturing
8. **Keep away from water sources** and beehives

## Regional Restrictions

### India
- Ban on certain pesticides (e.g., endosulfan)
- FSSAI limits on residue in food
- State-level restrictions may apply

### Africa (General)
- WHO recommends banning highly hazardous pesticides
- EPA guidelines vary by country
- Organic standards prohibit synthetic chemicals

## Escalation Triggers
- If user requests dosage > 2x maximum limit → escalate to expert
- If user requests banned pesticide → recommend alternative
- If crop is near harvest → warn about pre-harvest interval
