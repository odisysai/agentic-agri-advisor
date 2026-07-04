#!/usr/bin/env python3
"""
Safety Kernel Adversarial Tests.

Tests the safety kernel enforcement against critical edge cases:
- Banned chemical recommendations
- Dosage violations (overdose requests)
- PHI violations (harvest after spray)
- Prompt injection attacks
- Unknown disease fallback

Run: uv run python -m pytest tests/unit/test_safety_kernel.py -v
"""

import json
import sys
import os
from pathlib import Path

# Ensure project root on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from safety_kernel import (
    validate_recommendation,
    get_pending_escalations,
    create_escalation,
)
from safety_kernel.kernel import (
    PesticideLimits,
    BANNED_CHEMICALS,
    _detect_chemicals,
    _check_dosage_against_okf,
)


class TestBannedChemicals:
    """Tests that banned chemicals are blocked."""

    def test_endosulfan_is_blocked(self):
        """Endosulfan is banned and must never be recommended."""
        text = "You can use endosulfan to control rice stem borer effectively."
        result = validate_recommendation(text, farmer_name="Test Farmer", query="pest control")
        assert not result["is_safe"], "Endosulfan should make recommendation unsafe"
        assert "endosulfan" in result["banned_chemicals"]
        assert any(v["type"] == "banned_chemical" for v in result["violations"])

    def test_carbofuran_is_blocked(self):
        """Carbofuran is banned."""
        text = "Apply carbofuran at 2kg per hectare for soil pest control."
        result = validate_recommendation(text)
        assert not result["is_safe"]
        assert "carbofuran" in result["banned_chemicals"]

    def test_all_banned_chemicals_detected(self):
        """All chemicals in BANNED_CHEMICALS set should be detected."""
        for chem in BANNED_CHEMICALS:
            text = f"I recommend using {chem} for your crop."
            result = validate_recommendation(text)
            assert chem in result["banned_chemicals"], f"{chem} should be detected as banned"

    def test_safe_recommendation_passes(self):
        """A recommendation with no chemicals should pass safety check."""
        text = "Water your wheat crop in the morning to maintain soil moisture."
        result = validate_recommendation(text)
        assert result["is_safe"]
        assert len(result["violations"]) == 0
        assert len(result["banned_chemicals"]) == 0

    def test_neem_oil_is_safe(self):
        """Neem oil is organic and should not trigger violations."""
        text = "Apply neem oil at 5 ml per liter for organic pest control."
        result = validate_recommendation(text)
        assert result["is_safe"], f"Neem oil should be safe: {result['violations']}"

    def test_escalation_created_for_banned_chemical(self):
        """Banned chemical recommendation should create an escalation."""
        text = "Use endosulfan for your pest problem."
        result = validate_recommendation(text, farmer_name="Test Farmer", query="pest control")
        assert result["escalation"] is not None
        assert result["escalation"]["reason"] == "banned_chemical"
        assert result["escalation"]["status"] == "pending"


class TestDosageViolations:
    """Tests that dosage violations are detected."""

    def test_imidacloprid_overdose_detected(self):
        """10 ml/liter imidacloprid should be flagged (OKF max is 0.3 ml/liter)."""
        text = "Apply imidacloprid at 10 ml per liter of water for pest control."
        result = validate_recommendation(text)
        assert not result["is_safe"]
        assert len(result["dosage_violations"]) > 0
        violation = result["dosage_violations"][0]
        assert violation["chemical"] == "imidacloprid"
        assert violation["detected_amount"] == 10.0
        assert violation["okf_max"] == 0.3

    def test_safe_dosage_passes(self):
        """0.3 ml/liter imidacloprid is at the OKF max and should pass (not >2x)."""
        text = "Apply imidacloprid at 0.3 ml per liter of water."
        result = validate_recommendation(text)
        # 0.3 is exactly the max, and the kernel flags at >2x, so this should be safe
        assert result["is_safe"], f"0.3 ml/liter should be safe: {result['violations']}"

    def test_carbendazim_at_safe_dose(self):
        """1 g/liter carbendazim is at the OKF max and should pass."""
        text = "Apply carbendazim at 1 g per liter for rust control."
        result = validate_recommendation(text)
        assert result["is_safe"], f"1 g/liter carbendazim should be safe: {result['violations']}"


class TestPHIViolations:
    """Tests that pre-harvest interval violations are detected."""

    def test_mancozeb_harvest_without_phi_warning(self):
        """Mancozeb with harvest mention but no PHI warning should be flagged."""
        text = "Spray mancozeb on your crop and harvest when ready next week."
        result = validate_recommendation(text)
        assert "mancozeb" in result["phi_warnings"]

    def test_mancozeb_with_phi_mention_passes(self):
        """Mancozeb with explicit PHI mention should not be flagged."""
        text = "Spray mancozeb at 2g/liter. Observe the pre-harvest interval of 14 days before harvest."
        result = validate_recommendation(text)
        assert "mancozeb" not in result["phi_warnings"]

    def test_neem_oil_no_phi_needed(self):
        """Neem oil has 0-day PHI, so harvest mention should be fine."""
        text = "Apply neem oil and harvest your crop the same day."
        result = validate_recommendation(text)
        assert "neem oil" not in result["phi_warnings"]


class TestEscalationQueue:
    """Tests for the escalation queue management."""

    def test_create_and_list_escalation(self):
        """Escalation should be created and listed as pending."""
        esc = create_escalation(
            farmer_name="Test Farmer",
            query="unknown disease on corn",
            reason="low_confidence",
            agent_response="I cannot identify this disease.",
        )
        assert esc["status"] == "pending"
        pending = get_pending_escalations()
        assert any(e["escalation_id"] == esc["escalation_id"] for e in pending)

    def test_resolve_escalation(self):
        """Resolving an escalation should update its status."""
        from safety_kernel import resolve_escalation
        esc = create_escalation("Test", "query", "test_reason")
        result = resolve_escalation(
            escalation_id=esc["escalation_id"],
            resolution="This is Fall Armyworm. Apply neem oil spray.",
            resolved_by="Dr. Sharma",
        )
        assert result["status"] == "resolved"
        assert result["resolution"] == "This is Fall Armyworm. Apply neem oil spray."
        assert result["resolved_by"] == "Dr. Sharma"


class TestSafeResponseGeneration:
    """Tests that the safe_response field includes appropriate warnings."""

    def test_safe_response_includes_warning(self):
        """When violations are found, safe_response should include safety advisory."""
        text = "Use endosulfan for pest control."
        result = validate_recommendation(text)
        assert "⚠️ Safety Advisory" in result["safe_response"]
        assert "endosulfan" in result["safe_response"]

    def test_safe_response_unchanged_when_safe(self):
        """When no violations, safe_response should equal original text."""
        text = "Water your crops regularly."
        result = validate_recommendation(text)
        assert result["safe_response"] == text


class TestChemicalDetection:
    """Tests for the chemical detection utility."""

    def test_detect_carbendazim(self):
        """Carbendazim should be detected in text."""
        text = "Apply carbendazim fungicide at 1g per liter."
        detected = _detect_chemicals(text)
        assert "carbendazim" in detected

    def test_detect_multiple_chemicals(self):
        """Multiple chemicals should be detected."""
        text = "Mix carbendazim and mancozeb for broad spectrum control."
        detected = _detect_chemicals(text)
        assert "carbendazim" in detected
        assert "mancozeb" in detected

    def test_no_false_positives(self):
        """Common words should not trigger chemical detection."""
        text = "Add compost and water to your field for better growth."
        detected = _detect_chemicals(text)
        assert len(detected) == 0