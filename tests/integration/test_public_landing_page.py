import re
import subprocess

import requests

from tests.integration.conftest import BASE_URL


def _landing_html() -> str:
    r = requests.get(f"{BASE_URL}/", timeout=20)
    assert r.status_code == 200
    return r.text


def test_landing_page_loads(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert "Krishi Sampark" in html
    assert "Your farming companion for better decisions" in html


def test_feature_cards_render(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    for title in [
        "Ask or Speak to Krishi Sastri",
        "Crop Photo Check",
        "Soil Report",
        "Mandi Prices",
        "Today's Farm Plan",
        "Expert Help",
    ]:
        assert title in html


def test_how_it_works_renders(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert "How it works" in html
    assert "Tell us about your farm" in html
    assert "Ask, upload, or take a photo" in html
    assert "Get simple guidance and next actions" in html


def test_language_selector_exists(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert 'id="language-selector"' in html


def test_guest_modal_and_actions_exist(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert 'id="guest-modal"' in html
    assert 'id="guest-continue"' in html
    assert 'id="guest-skip"' in html


def test_mobile_responsive_meta_exists(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert 'name="viewport" content="width=device-width, initial-scale=1.0"' in html


def test_google_login_button_hook_exists(server_fixture: subprocess.Popen[str]) -> None:
    js = requests.get(f"{BASE_URL}/landing.js", timeout=20)
    assert js.status_code == 200
    body = js.text
    assert "hero-google-btn" in body
    assert "/api/auth/google" in body


def test_google_button_text_is_clean(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert "Sign in with Google" in html
    assert "G Sign in with Google" not in html


def test_guest_can_continue_without_email(
    server_fixture: subprocess.Popen[str],
) -> None:
    r = requests.post(
        f"{BASE_URL}/api/auth/guest",
        json={"email": "", "name": "Guest"},
        timeout=20,
    )
    assert r.status_code == 200
    payload = r.json()
    assert payload.get("authenticated") is True


def test_invalid_guest_email_shows_validation_contract(
    server_fixture: subprocess.Popen[str],
) -> None:
    r = requests.post(
        f"{BASE_URL}/api/auth/guest",
        json={"email": "bad-email", "name": "Guest"},
        timeout=20,
    )
    assert r.status_code == 400


def test_valid_guest_email_continues(server_fixture: subprocess.Popen[str]) -> None:
    r = requests.post(
        f"{BASE_URL}/api/auth/guest",
        json={"email": "demo@example.com", "name": "Guest"},
        timeout=20,
    )
    assert r.status_code == 200
    assert r.json().get("authenticated") is True


def test_protected_routes_redirect_unauthenticated(
    server_fixture: subprocess.Popen[str],
) -> None:
    s = requests.Session()
    s.cookies.clear()
    r = s.get(f"{BASE_URL}/app/home", allow_redirects=False, timeout=20)
    assert r.status_code in {302, 307}
    assert r.headers.get("location") == "/"


def test_farmer_facing_page_avoids_internal_terms(
    server_fixture: subprocess.Popen[str],
) -> None:
    html = _landing_html().lower()
    forbidden = [
        "oidc",
        "mcp",
        "rag",
        "adk",
        "llm",
        "gemini",
        "gemma",
        "tflite",
        "agent runtime",
        "vector database",
    ]
    for word in forbidden:
        assert re.search(rf"\b{word}\b", html) is None


def test_capstone_section_avoids_production_claim(
    server_fixture: subprocess.Popen[str],
) -> None:
    html = _landing_html()
    assert "Krishi Sampark Platform" in html
    assert "Capstone demo platform" in html
    assert "Production-ready" not in html


def test_english_first_title_default(server_fixture: subprocess.Popen[str]) -> None:
    html = _landing_html()
    assert "Your farming companion for better decisions" in html


def test_translation_placeholders_exist_in_js(
    server_fixture: subprocess.Popen[str],
) -> None:
    js = requests.get(f"{BASE_URL}/landing.js", timeout=20)
    assert js.status_code == 200
    body = js.text
    for marker in ["[HI]", "[MR]", "[TE]", "[SW]"]:
        assert marker in body
    for key in [
        "landing.hero.title",
        "landing.auth.signingInSecurely",
        "landing.features.askTitle",
        "landing.howItWorks.summary",
        "landing.howItWorks.step1Title",
        "landing.trust.title",
        "landing.capstone.description",
        "landing.footer.copyright",
    ]:
        assert key in body


def test_mobile_layout_usability_hooks_exist(
    server_fixture: subprocess.Popen[str],
) -> None:
    css = requests.get(f"{BASE_URL}/landing.css", timeout=20)
    assert css.status_code == 200
    body = css.text
    assert "@media (max-width: 680px)" in body
    assert ".hero-actions .btn { width: 100%; }" in body


def test_enhanced_hero_image_reference_exists(
    server_fixture: subprocess.Popen[str],
) -> None:
    css = requests.get(f"{BASE_URL}/landing.css", timeout=20)
    assert css.status_code == 200
    assert "farm_tech_innovation_in_agriculture.png" in css.text


def test_dashboard_route_still_exists_after_guest_auth(
    server_fixture: subprocess.Popen[str],
) -> None:
    s = requests.Session()
    login = s.post(
        f"{BASE_URL}/api/auth/guest",
        json={"email": "", "name": "Guest"},
        timeout=20,
    )
    assert login.status_code == 200

    r = s.get(f"{BASE_URL}/app/home", allow_redirects=False, timeout=20)
    assert r.status_code != 404
