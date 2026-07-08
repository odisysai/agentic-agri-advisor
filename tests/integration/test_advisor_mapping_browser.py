import re
import subprocess

from playwright.sync_api import Page, expect

from tests.integration.conftest import BASE_URL


def _login_guest_and_open_app(page: Page) -> None:
    page.goto(BASE_URL)
    page.evaluate(
        """async () => {
            const response = await fetch('/api/auth/guest', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Madhav Ji', email: '', preferred_language: 'hi' })
            });
            if (!response.ok) throw new Error(`guest login failed ${response.status}`);
            localStorage.setItem('aaa_preferred_language', 'hi');
            localStorage.setItem('aaa_farmer_profile', JSON.stringify({
              farmer_name: 'माधव जी',
              primary_crop: 'corn',
              soil_type: 'clay',
              preferred_language: 'hi'
            }));
        }"""
    )
    page.goto(f"{BASE_URL}/app/home")
    page.wait_for_load_state("networkidle")


def test_sastri_hindi_response_stays_local_and_translated(
    page: Page, server_fixture: subprocess.Popen[str]
) -> None:
    expert_calls: list[str] = []

    def capture_expert(route):
        expert_calls.append(route.request.url)
        route.abort()

    page.route("**/api/expert/chat", capture_expert)
    _login_guest_and_open_app(page)

    page.locator('.left-nav-item[data-tab="ask"]').click()
    page.locator("#advisor-sastri-btn").click()
    expect(page.locator("#sastri-chat-screen")).to_be_visible()

    page.locator("#user-input-field").fill(
        "मेरी मिर्च की फसल के पत्तों पर छोटे-छोटे धब्बे दिख रहे हैं। क्या यह बीमारी हो सकती है?"
    )
    page.locator("#send-btn").click()

    response = page.locator("#chat-messages .agent-msg").last
    expect(response).to_be_visible(timeout=7000)
    text = response.locator(".message-text").inner_text()

    assert "कृषि विशेषज्ञ" in text
    assert not re.search(r"[A-Za-z]", text)
    assert "Pathologist" not in text
    assert "Coordinator" not in text
    assert "Running" not in text
    assert "**" not in text
    assert expert_calls == []


def test_complex_sastri_query_offers_bisesagya_escalation(
    page: Page, server_fixture: subprocess.Popen[str]
) -> None:
    _login_guest_and_open_app(page)

    page.locator('.left-nav-item[data-tab="ask"]').click()
    page.locator("#advisor-sastri-btn").click()
    page.locator("#user-input-field").fill("Wheat rust disease with pesticide dose")
    page.locator("#send-btn").click()

    expect(page.locator("#escalate-yes-btn")).to_be_visible(timeout=8000)
    expect(page.locator("#chat-messages")).to_contain_text("कृषि विशेषज्ञ")
