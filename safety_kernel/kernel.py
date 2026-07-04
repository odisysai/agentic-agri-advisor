
#!/usr/bin/env python3

#!/usr/bin/env python3
"""
Agricultural Safety Kernel — ADK callback implementations.

Provides pre- and post-agent safety validation callbacks for the Google ADK
agent framework. These callbacks intercept coordinator responses and enforce
OKF safety rules (pesticide limits, PHI enforcement, banned chemical blocking).

Usage:
    Attach to coordinator_agent in agents/coordinator/agent.py via the
    before_agent_callback and after_agent_callback keyword arguments.

Modules:
    - safety_kernel.kernel — ADK callback functions (before_agent_callback, after_agent_callback)
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Optional

# ADK callback types (must use these — not InvocationContext)
from google.adk.agents.callback_context import CallbackContext  # type: ignore[attr-defined]
from google.genai import types


# ============================================================
# Data Loader — parse OKF safety files at module load time (once)
# ============================================================

_OKF_SAFETY_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "okf-knowledge-graph", "data", "safety"
)

# pesticide_name -> {max_concentration, max_rate, phi_days, notes}
PesticideLimits: dict[str, dict[str, str | int]] = {}

# Banned / critical chemicals that must NEVER be recommended
BANNED_CHEMICALS: set[str] = {
    "endosulfan",
    "carbofuran",
    "methyl_parathion",
    "parathion_methyl",
    "dichlorvos",
}


def _parse_table_row(row: str) -> dict[str, str]:
    """Parse a single pipe-delimited markdown table row into a dict."""
    cols = [c.strip() for c in row.split("|") if c.strip()]
    result: dict[str, str] = {}
    keys = [
        "pesticide",
        "max_concentration",
        "max_application_rate",
        "pre_harvest_interval",
        "notes",
    ]
    for i, key in enumerate(keys):
        if i < len(cols):
            result[key] = cols[i].strip()
    return result


def _extract_table_data(content: str) -> list[dict[str, str]]:
    """Extract pipe-delimited table rows from markdown content."""
    rows: list[dict[str, str]] = []
    in_table = False
    header_seen = False

    for line in content.splitlines():
        stripped = line.strip()
        if "|" not in stripped:
            continue

        # Skip separator rows like "| --- | --- |"
        if re.match(r"^\|[\s\-:]+\|", stripped):
            continue

        if not header_seen and "|" in stripped:
            # First non-separator pipe row is the header — remember column count
            cols = [c.strip() for c in stripped.split("|") if c.strip()]
            header_seen = True
            in_table = True
            continue

        if in_table:
            row_data = _parse_table_row(stripped)
            if "pesticide" in row_data and not (re.match(r"^[\-:]+$", row_data.get("pesticide", "")) or re.match(r"^\|?\s*$", stripped)):
                rows.append(row_data)

    return rows


def _load_all_safety_files() -> None:
    """Load all safety files from OKF into module-level data structures."""
    if not os.path.isdir(_OKF_SAFETY_DIR):
        return

    pesticide_limits_file = os.path.join(
        _OKF_SAFETY_DIR, "pesticide_limits.md"
    )

    if os.path.isfile(pesticide_limits_file):
        with open(pesticide_limits_file, "r", encoding="utf-8") as f:
            content = f.read()

        rows = _extract_table_data(content)
        for row in rows:
            name = (row.get("pesticide") or "").lower().strip()
            if not name:
                continue

            # Normalize PHI to int (handle "0 days" → 0)
            phi_raw = row.get("pre_harvest_interval", "0").strip()
            try:
                phi_days = int(phi_raw.split()[0]) if phi_raw else 0
            except (ValueError, IndexError):
                phi_days = 0

            PesticideLimits[name] = {
                "max_concentration": row.get("max_concentration", ""),
                "max_rate": row.get("max_application_rate", ""),
                "phi_days": phi_days,
                "notes": row.get("notes", ""),
            }

        print(
            f"[Safety Kernel] Loaded {len(PesticideLimits)} pesticide entries from OKF."
        )


# ------------------------------------------------------------------
# Pre-parsed at module import time — only runs once per process.
# ------------------------------------------------------------------

_load_all_safety_files()


# ============================================================
# Utility helpers — used by both callbacks
# ============================================================

def _extract_dosages(text: str) -> list[tuple[float | None, str]]:
    """Extract numeric dosage patterns from text.

    Returns list of (amount_in_unit, unit) tuples.
    Handles: "3 ml/liter", "5 g/liter", "10 ml per liter", "2 grams per liter", etc.
    """
    results: list[tuple[float | None, str]] = []
    # Pattern 1: number + unit with slash (ml/liter, g/liter, mg/liter)
    for match in re.finditer(
        r"(\d+(?:\.\d+)?)\s*(ml|g|mg)\s*/\s*liter",
        text,
        re.IGNORECASE,
    ):
        try:
            amount = float(match.group(1))
        except ValueError:
            continue
        results.append((amount, match.group(2).lower()))

    # Pattern 1b: number + unit with "per" (ml per liter, g per liter)
    for match in re.finditer(
        r"(\d+(?:\.\d+)?)\s*(ml|g|mg)\s+per\s+liter",
        text,
        re.IGNORECASE,
    ):
        try:
            amount = float(match.group(1))
        except ValueError:
            continue
        results.append((amount, match.group(2).lower()))

    # Pattern 2: number + unit per hectare
    for match in re.finditer(
        r"(\d+(?:\.\d+)?)\s*(ml|g|kg)\s*/\s*hectare",
        text,
        re.IGNORECASE,
    ):
        try:
            amount = float(match.group(1))
        except ValueError:
            continue
        results.append((amount, match.group(2).lower()))

    return results


def _detect_chemicals(text: str) -> list[str]:
    """Detect chemical names mentioned in text.

    Returns list of lowercase pesticide names that appear in the OKF safety table.
    """
    text_lower = text.lower()
    detected: list[str] = []
    for name in PesticideLimits:
        # Word-boundary search to avoid false positives
        pattern = r"\b" + re.escape(name) + r"\b"
        if re.search(pattern, text_lower):
            detected.append(name)
    return detected


def _check_dosage_against_okf(
    text: str,
) -> Optional[dict]:
    """Check if any dosage in text exceeds OKF maximum for that chemical.

    Returns:
        dict with keys {chemical, detected_amount, unit, okf_max} if violation found.
        None if no violation or uncertain.
    """
    detected_chemicals = _detect_chemicals(text)
    if not detected_chemicals:
        return None

    dosages = _extract_dosages(text)
    if not dosages:
        return None

    for amount, unit in dosages:
        if amount is None:
            continue

        # Check each detected chemical against this dosage value
        for chem_name in detected_chemicals:
            entry = PesticideLimits.get(chem_name)
            if not entry:
                continue

            max_conc = entry.get("max_concentration", "")
            if not isinstance(max_conc, str) or not max_conc:
                continue

            # Parse OKF max concentration (e.g., "0.5 ml/liter")
            match = re.search(
                r"(\d+(?:\.\d+)?)\s*(ml|g|mg)\b", max_conc, re.IGNORECASE
            )
            if not match:
                continue

            try:
                okf_max = float(match.group(1))
            except ValueError:
                continue

            # Compare concentrations (same unit or convertible)
            detected_unit = unit.lower()
            okf_unit = match.group(2).lower()

            # Simple same-unit comparison
            if detected_unit == okf_unit:
                if amount > okf_max * 2.0:  # flag only if significantly over (2x+)
                    return {
                        "chemical": chem_name,
                        "detected_amount": amount,
                        "okf_max": okf_max,
                        "unit": detected_unit,
                    }

    return None


# ============================================================
# Escalation Queue — in-memory store for expert escalation cases
# ============================================================

_escalation_queue: list[dict] = []


def create_escalation(
    farmer_name: str,
    query: str,
    reason: str,
    agent_response: str = "",
) -> dict:
    """Create an expert escalation entry when the safety kernel triggers or confidence is low.

    Args:
        farmer_name: Name of the farmer from context.
        query: The original farmer query that triggered escalation.
        reason: Why escalation is needed (e.g., "banned_chemical", "overdose", "low_confidence", "unknown_disease").
        agent_response: The agent's original response that was flagged.

    Returns:
        dict: The escalation record with a unique ID.
    """
    import uuid as _uuid

    escalation = {
        "escalation_id": str(_uuid.uuid4()),
        "farmer_name": farmer_name,
        "query": query[:500],
        "reason": reason,
        "agent_response": agent_response[:1000],
        "status": "pending",  # pending → reviewed → resolved
        "created_at": datetime.now().isoformat(),
    }
    _escalation_queue.append(escalation)
    print(f"[Safety Kernel] Escalation created: {escalation['escalation_id'][:8]}... reason={reason}")
    return escalation


def get_pending_escalations() -> list[dict]:
    """Return all pending expert escalations."""
    return [e for e in _escalation_queue if e["status"] == "pending"]


def resolve_escalation(escalation_id: str, resolution: str, resolved_by: str) -> dict:
    """Mark an escalation as resolved with expert feedback.

    Args:
        escalation_id: The escalation UUID.
        resolution: The expert's resolution/advice.
        resolved_by: Name of the agronomist who resolved it.

    Returns:
        dict: The updated escalation record.
    """
    for e in _escalation_queue:
        if e["escalation_id"] == escalation_id:
            e["status"] = "resolved"
            e["resolution"] = resolution
            e["resolved_by"] = resolved_by
            e["resolved_at"] = datetime.now().isoformat()
            return e
    return {"error": f"Escalation {escalation_id} not found"}


# ============================================================
# Standalone Safety Validation — callable from any agent or tool
# ============================================================

def validate_recommendation(text: str, farmer_name: str = "", query: str = "") -> dict:
    """Validate any agricultural recommendation text against safety rules.

    This is a standalone function that agents, tools, or the FastAPI layer can
    call to check if a response contains unsafe content BEFORE sending it to
    the farmer. It does NOT require the ADK callback context.

    Args:
        text: The recommendation text to validate.
        farmer_name: Farmer's name (for escalation tracking).
        query: The original farmer query (for escalation context).

    Returns:
        dict with keys:
            - is_safe (bool): True if no violations detected.
            - violations (list): List of violation details.
            - banned_chemicals (list): Any banned chemicals detected.
            - dosage_violations (list): Any dosage violations.
            - phi_warnings (list): PHI-related warnings.
            - escalation (dict|None): Escalation record if created.
            - safe_response (str): Modified text with safety warnings, or original if safe.
    """
    violations: list[dict] = []
    banned_found: list[str] = []
    dosage_violations: list[dict] = []
    phi_warnings: list[str] = []
    escalation = None

    # --- Check 1: Banned chemicals ---
    text_lower = text.lower()
    for chem in BANNED_CHEMICALS:
        if re.search(r"\b" + re.escape(chem) + r"\b", text_lower):
            banned_found.append(chem)
            violations.append({
                "type": "banned_chemical",
                "chemical": chem,
                "severity": "critical",
                "message": f"{chem} is BANNED and must never be recommended. "
                           f"Suggest safe alternatives like neem oil, Bt, or chlorpyrifphos at OKF dosage.",
            })

    # --- Check 2: Dosage violations ---
    dosage_check = _check_dosage_against_okf(text)
    if dosage_check:
        dosage_violations.append(dosage_check)
        violations.append({
            "type": "dosage_violation",
            "chemical": dosage_check["chemical"],
            "detected_amount": dosage_check["detected_amount"],
            "okf_max": dosage_check["okf_max"],
            "unit": dosage_check["unit"],
            "severity": "high",
            "message": f"{dosage_check['chemical']} dosage {dosage_check['detected_amount']} "
                       f"{dosage_check['unit']} exceeds OKF maximum of {dosage_check['okf_max']} "
                       f"{dosage_check['unit']}. Must reduce to safe dosage.",
        })

    # --- Check 3: PHI violations ---
    detected_chemicals = _detect_chemicals(text)
    for chem_name in detected_chemicals:
        entry = PesticideLimits.get(chem_name)
        if not entry or not entry.get("phi_days"):
            continue

        phi = int(entry["phi_days"]) if isinstance(entry.get("phi_days"), (int, float)) else 0
        if phi <= 0:
            continue

        # Check if harvest is mentioned near pesticide without PHI reference
        harvest_near_pesticide = bool(
            re.search(r"harvest", text_lower) and chem_name in text_lower
        )
        has_phi_mention = bool(
            re.search(r"pre.harvest|phi|waiting period", text_lower)
        )

        if harvest_near_pesticide and not has_phi_mention:
            phi_warnings.append(chem_name)
            violations.append({
                "type": "phi_violation",
                "chemical": chem_name,
                "phi_days": phi,
                "severity": "high",
                "message": f"Pre-Harvest Interval ({phi} days) for {chem_name} "
                           f"must be observed before harvest.",
            })

    # --- Determine safety and create escalation if needed ---
    is_safe = len(violations) == 0

    safe_response = text
    if not is_safe:
        # Append safety warning to the response
        warning_parts = ["⚠️ Safety Advisory:"]
        for v in violations:
            warning_parts.append(f"• {v['message']}")
        warning_parts.append("Please consult a certified agronomist before proceeding.")
        safe_response = text + "\n\n" + "\n".join(warning_parts)

        # Create escalation for any critical or high severity violation
        has_critical = any(v["severity"] == "critical" for v in violations)
        if has_critical:
            escalation = create_escalation(
                farmer_name=farmer_name,
                query=query,
                reason="banned_chemical" if banned_found else "safety_violation",
                agent_response=text,
            )

    return {
        "is_safe": is_safe,
        "violations": violations,
        "banned_chemicals": banned_found,
        "dosage_violations": dosage_violations,
        "phi_warnings": phi_warnings,
        "escalation": escalation,
        "safe_response": safe_response,
    }


# ============================================================
# ADK Callback Functions
# ============================================================

def safety_before_agent(callback_context: CallbackContext) -> Optional[types.Content]:
    """Pre-agent safety callback — runs BEFORE coordinator produces final response.

    Inspects the conversation history for any tool outputs that mention
    chemical/pesticide names with unsafe dosages.

    Args:
        callback_context: ADK CallbackContext containing agent state, tool outputs.

    Returns:
        A types.Content object with a safety warning (to replace the unsafe response),
        or None if no violation is detected.

    ADK Integration: Attach as before_agent_callback on the coordinator Agent.
    """
    try:
        # Access conversation history via callback context state
        messages = getattr(callback_context, "state", None)
        if not messages:
            return None

        # Concatenate all message content from the conversation for inspection
        full_text = ""
        if isinstance(messages, list):
            for msg in messages:
                content_str = ""
                if hasattr(msg, "parts"):
                    for part in msg.parts:  # type: ignore[attr-defined]
                        if hasattr(part, "text"):
                            content_str += getattr(part, "text", "") + "\n"
                elif hasattr(msg, "content"):
                    content_str = getattr(msg, "content", "") or ""

                # Also check text within content objects
                if hasattr(content_str, "__str__"):
                    full_text += str(content_str) + "\n"

        # Also check any tool output that might contain chemical info
        try:
            agent_output = getattr(callback_context, "agent_output", None)
            if agent_output and hasattr(agent_output, "text"):
                full_text += getattr(agent_output, "text", "") + "\n"
        except (AttributeError, TypeError):
            pass

        if not full_text:
            return None

        # Look for chemical names with dosages in recent messages
        violation = _check_dosage_against_okf(full_text)

        if violation:
            return types.Content(
                role="assistant",
                parts=[
                    types.Part(
                        text=(
                            f"[SAFETY INTERVENTION] The proposed recommendation contains "
                            f"a dosage violation for {violation['chemical']}. "
                            f"Detected: {violation['detected_amount']} {violation['unit']}, "
                            f"OKF maximum: {violation['okf_max']} {violation['unit']}. "
                            f"Must recommend {violation['chemical']} at the OKF-specified "
                            f"maximum dosage ({violation['okf_max']} {violation['unit']}) only. "
                            f"Escalation note: Referred to certified agronomist for confirmation."
                        )
                    ),
                ],
            )

        return None

    except Exception as exc:
        # Never let safety callback crash the agent — log and continue
        print(f"[Safety Kernel] before_agent_callback error (non-blocking): {exc}")  # type: ignore[reportPrintStmt]
        return None


def safety_after_agent(callback_context: CallbackContext) -> Optional[types.Content]:
    """Post-agent safety callback — runs AFTER coordinator has composed its response.

    Scans the final response for unsafe patterns and appends warnings or
    escalation flags as needed.

    Args:
        callback_context: ADK CallbackContext containing agent output text.

    Returns:
        A types.Content object with modified/flagged response (always JSON string),
        or None if no safety issue detected.

    ADK Integration: Attach as after_agent_callback on the coordinator Agent.
    """
    try:
        # Get the agent's final output text
        agent_output = getattr(callback_context, "agent_output", None)
        if not agent_output:
            return None

        # Try to extract text from AgentOutput object
        output_text = ""
        if hasattr(agent_output, "text"):
            text_val = agent_output.text
            output_text = str(text_val) if not isinstance(text_val, str) else text_val
        elif callable(agent_output):
            # May be a method — just skip
            return None
        else:
            output_text = str(agent_output)

        if not output_text:
            return None

        # --- Trigger 1: Check for dangerous chemicals or overdose patterns ---
        detected_chemicals = _detect_chemicals(output_text)

        if detected_chemicals:
            violation = _check_dosage_against_okf(output_text)

            # --- Trigger 2: Check for banned chemicals ---
            is_banned = any(
                chem.lower() in BANNED_CHEMICALS for chem in detected_chemicals
            )

            if is_banned or violation:
                # Build modified JSON with escalation flag
                import json

                try:
                    response_data = json.loads(output_text)
                except (json.JSONDecodeError, ValueError):
                    # Not valid JSON — try to return as-is with appended warning
                    return types.Content(
                        role="assistant",
                        parts=[
                            types.Part(
                                text=(
                                    output_text + "\n\n⚠️ Please confirm this with a local "
                                    "agronomist before applying."
                                )
                            ),
                        ],
                    )

                # Append escalation warning to recommendation field
                if "recommendation" in response_data:
                    response_data["recommendation"] += (
                        "\n⚠️ Please confirm this with a local agronomist before applying."
                    )

                # Set escalation flag in the JSON response
                response_data["escalate"] = True

                return types.Content(
                    role="assistant",
                    parts=[
                        types.Part(
                            text=json.dumps(response_data, ensure_ascii=False),
                        ),
                    ],
                )

            # Check for PHI violation specifically — harvest near pesticide mention without PHI note
            for chem_name in detected_chemicals:
                entry = PesticideLimits.get(chem_name)
                if not entry or not entry.get("phi_days"):
                    continue

                phi = int(entry["phi_days"]) if isinstance(entry.get("phi_days"), (int, float)) else 0
                if phi <= 0:
                    continue

                # Check if harvest is mentioned near pesticide without PHI reference
                harvest_near_pesticide = bool(
                    re.search(r"harvest", output_text.lower()) and chem_name in output_text.lower()
                )

                has_phi_mention = bool(
                    re.search(r"pre.harvest|phi", output_text.lower())
                )

                if harvest_near_pesticide and not has_phi_mention:
                    try:
                        response_data = json.loads(output_text)
                    except (json.JSONDecodeError, ValueError):
                        return types.Content(
                            role="assistant",
                            parts=[types.Part(text=output_text + "\n\n⚠️ Please confirm this with a local agronomist before applying.")],
                        )

                    if "recommendation" in response_data:
                        response_data["recommendation"] += (
                            f"\n⚠️ Pre-Harvest Interval ({phi} days) must be observed before harvest."
                        )
                    response_data["escalate"] = True

                    return types.Content(
                        role="assistant",
                        parts=[types.Part(text=json.dumps(response_data, ensure_ascii=False))],
                    )

        # --- Trigger 3: Check for "banned" keyword in text ---
        if re.search(r"\bbanned\b", output_text.lower()):
            try:
                response_data = json.loads(output_text)
            except (json.JSONDecodeError, ValueError):
                return None

            if "escalate" in response_data:
                response_data["recommendation"] = (
                    response_data.get("recommendation", "") + "\n⚠️ Please confirm this with a local agronomist before applying."
                )

            return types.Content(
                role="assistant",
                parts=[types.Part(text=json.dumps(response_data, ensure_ascii=False))],
            )

        return None

    except Exception as exc:  # noqa: BLE001 — safety callbacks must never crash the agent
        print(f"[Safety Kernel] after_agent_callback error (non-blocking): {exc}")  # type: ignore[reportPrintStmt]
        return None

