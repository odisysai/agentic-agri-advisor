"""
Agricultural Safety Kernel — enforcement module.

This module enforces OKF safety rules when agents generate advice that involves:
- Pesticide/fungicide/insecticide recommendations (dosage limits, PHI)
- Organic vs chemical treatments (safety-first principle)
- Emergency situations (poisoning, reaction symptoms)

Called by the coordinator agent or any specialist agent before returning output.

Exports:
    - safety_before_agent — ADK pre-agent callback (inserted via before_agent_callback kwarg)
    - safety_after_agent — ADK post-agent callback (inserted via after_agent_callback kwarg)
"""

import os
from dataclasses import dataclass, field
from typing import Optional


# ---- ADK callback exports (Task 0.1) ----
from safety_kernel.kernel import (
    safety_before_agent,
    safety_after_agent,
    validate_recommendation,
    create_escalation,
    get_pending_escalations,
    resolve_escalation,
)


EMERGENCY_PATTERNS: set[str] = {
    "poison", "poisoning", "toxic", "vomit", "vomiting", "dizzy", "dizziness",
    "hospital", "doctor", "medical", "swallowed", "inhaled", "burn", "rash"
}

SAFETY_KEYWORDS: dict[str, dict[str, str]] = {
    "endosulfan": {"level": "critical"},
    "carbofuran": {"level": "critical"},
    "methyl_parathion": {"level": "critical"},
    "parathion_methyl": {"level": "critical"},
    "dichlorvos": {"level": "critical"},
}

@dataclass
class SafetyCheck:
    """Result of a safety evaluation on an agent response."""
    safe: bool = True
    flags: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    required_append_text: str = ""

    def add_flag(self, flag: str):
        self.safe = False
        self.flags.append(flag)

    def add_warning(self, warning: str):
        self.warnings.append(warning)


def check_response_safety(response_text: str, safety_rules_context: dict = None) -> SafetyCheck:
    """Evaluate agent response against OKF safety rules.

    Args:
        response_text: The raw text the agent wants to return to the farmer.
        safety_rules_context: Optional pre-loaded safety rule content from OKF query.

    Returns:
        SafetyCheck with safe/unsafe status and required modifications.
    """
    check = SafetyCheck()

    text_lower = response_text.lower()

    # ---- EMERGENCY PATTERNS (medical) ----
    for pattern in EMERGENCY_PATTERNS:
        if pattern in text_lower:
            check.add_flag("EMERGENCY_PATTERNS_DETECTED")
            check.add_warning(
                "⚠️ Farmer may be experiencing health symptoms. Recommend immediate medical attention first, then address agricultural issue."
            )

    # ---- CRITICAL PESTICIDE CHECKS ----
    for chemical, safety_level in SAFETY_KEYWORDS.items():
        if safety_level.get("level") == "critical":
            # Search whole response for the chemical name
            if any(chemical in word.lower() for word in text_lower.split()):
                check.add_flag(f"CRITICAL_CHEMICAL: {chemical.upper()}")
                check.add_warning(
                    f"❌ [{chemical.upper()}] is a banned/highly restricted chemical. "
                    "Never recommend this directly. Suggest an organic or safe alternative instead."
                )

    # ---- DOSAGE CHECKS for chemical treatments ----
    if any(kw in text_lower for kw in ["pesticide", "fungicide", "insecticide"]):
        # Check if response includes proper dosage guidance
        has_dosage = any(phrase in text_lower for phrase in [
            "follow label", "label instructions", "as per label",
            "manufacturer instructions", "recommended dosage"
        ])

        has_phil = any(phrase in text_lower for phrase in [
            "pre-harvest", "harvest interval", "phi",
            "wait before harvest"
        ])

        if not has_dosage:
            check.add_flag("MISSING_DOSAGE_WARNING")
            check.required_append_text += (
                "\n\n⚠️ IMPORTANT: Always follow the product label instructions for dosage. "
                "Wear protective gear (gloves, mask) during application."
            )

        if not has_phil:
            check.add_flag("MISSING_PHI_NOTE")
            check.required_append_text += (
                "\n\n📋 Note: Always observe the pre-harvest interval (PHI) before harvesting "
                "treated crops to avoid chemical residues."
            )

    # ---- SAFETY RULE CROSS-REFERENCE (from OKF) ----
    if safety_rules_context:
        rules = safety_rules_context.get("resolved_content", [])
        for rule in rules:
            content = rule.get("content", "").lower()
            if "bioaccumulation" in content:
                check.add_warning("⚠️ This substance may bioaccumulate — use sparingly.")

    return check


def sanitize_response(response_text: str, safety_rules_context: dict = None) -> tuple[str, SafetyCheck]:
    """Fully sanitize an agent response — return safe version + check result.

    Args:
        response_text: Original agent response.
        safety_rules_context: Optional OKF-sourced safety rules.

    Returns:
        Tuple of (sanitized_response, SafetyCheck).
    """
    check = check_response_safety(response_text, safety_rules_context)

    result = response_text
    if check.required_append_text:
        # Append safety notes to the response
        result = response_text.rstrip() + "\n" + check.required_append_text

    # If flagged as unsafe, wrap the critical items with warnings
    if check.flags:
        for flag in check.flags:
            warning = next((w for w in check.warnings if flag.split(":")[0] in w), "")
            if warning:
                result += "\n\n🚨 " + warning

    return result.strip(), check


# ---- Convenience function for agent integration ----
async def validate_agent_output(
    response_text: str,
    coordinator_context: dict = None,
) -> tuple[str, bool, list[str]]:
    """Quick validation wrapper for ADK agents.

    Args:
        response_text: Agent's proposed output text.
        coordinator_context: Optional farmer context (language, location).

    Returns:
        Tuple of (safe_response_text, is_safe, list_of_warnings).
    """
    safe_result, check = sanitize_response(response_text)

    warnings = []
    for f in check.flags:
        warnings.append(f"🚨 {f}")
    for w in check.warnings:
        warnings.append(w)

    return safe_result, check.safe, warnings


if __name__ == "__main__":
    # Test the safety kernel
    print("=" * 60)
    print("SAFETY KERNEL — Self-Test")
    print("=" * 60)

    test_responses = [
        # Test 1: Missing dosage info with pesticide mention
        (
            "Apply carbendazim fungicide at 2g per liter of water. Spray weekly.",
            "⚠️ This should trigger MISSING_DOSAGE_WARNING"
        ),
        # Test 2: Proper dosage with label instructions
        (
            "Apply carbendazim fungicide following the product label instructions. "
            "The recommended dosage is 2g per liter of water.",
            "✅ Should be mostly safe with proper label reference"
        ),
        # Test 3: Banned chemical mention
        (
            "Use carbofuran 3G for pest control. It's very effective.",
            "❌ Should trigger CRITICAL_CHEMICAL flag"
        ),
    ]

    for response, expected in test_responses:
        print(f"\n--- Test: {expected} ---")
        safe_result, check = sanitize_response(response)
        print(f"Safe: {check.safe}")
        print(f"Flags: {check.flags}")
        if check.warnings:
            print(f"Warnings: {check.warnings}")
        if safe_result != response:
            print(f"Modified Response:\n{safe_result}")
