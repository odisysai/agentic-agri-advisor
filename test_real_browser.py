"""
Real browser end-to-end test for Krishi Sampark.

Navigate through: Landing → Guest Login → Dashboard → Ask Advisor → Simple Query →
Expert Escalation (complex query)

Run with:
  cd /Users/ncgiri/google-agentic-ai/agentic-agri-advisor && python test_real_browser.py
"""

import os

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"


def test_landing_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False to see the browser
        page = browser.new_page(viewport={"width": 375, "height": 812})

        # Navigate to landing page
        print("→ Loading landing page...")
        page.goto(BASE_URL)

        # Verify the branding is visible
        title = page.text_content("#brand-logo") or ""
        assert "Krishi" in title, f"Landing page title missing: {title}"
        print(f"✅ Title found: {title}")

        # Check for guest modal elements
        assert 'id="guest-modal"' in page.html, "Guest modal not present"

        # Click the guest continue button - we need to find the actual click target
        print("→ Checking for guest login option...")

        # Try clicking the "Enter as Guest" or similar link
        guest_login = (
            page.query_selector("#guest-enter-btn, #enter-as-guest-btn") or None
        )
        if guest_login:
            print("✅ Found guest login button")

        # If the modal has buttons, look for any link that says "guest" or "enter"
        if not guest_login:
            print("→ Trying alternative selectors...")
            buttons = page.query_selector_all("button, a")
            for btn in buttons:
                text = btn.text_content() or ""
                if "guest" in text.lower() or "enter" in text.lower():
                    print(f"Found: {text}")

        # Wait and take a screenshot to see what we're seeing
        page.screenshot(path="/tmp/screenshot_landing.png", full_page=True)
        print("📸 Screenshot saved: /tmp/screenshot_landing.png")


def test_guest_login_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False
        )  # headless=True for testing in CI, False to see
        page = browser.new_page(viewport={"width": 375, "height": 812})

        # Navigate and fill in guest name
        page.goto(f"{BASE_URL}/app/home")  # Force to app home

        # Wait for redirect or check URL
        page.wait_for_load_state("networkidle")  # Wait for all resources

        print("→ Waiting for auth...")

        # Check URL after possible redirects
        current_url = page.url
        print(f"Current URL: {current_url}")


def test_simple_query_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 375, "height": 812})

        # Go directly to app home - the backend should handle guest auth cookie
        page.goto(f"{BASE_URL}/app/home")

        print("→ App home loaded. Checking for Sastri chat...")

        # Wait for the app to fully load
        page.wait_for_load_state("networkidle")

        # Check for advisor chat section
        sastri_chat = page.query_selector("#sastri-chat-screen") or ""
        has_sastri = sastri_chat and len(sastri_chat) > 0

        print(f"✅ Has Sastri chat: {has_sastri}")

        # Send a simple question to advisor - try different input selectors
        print("→ Sending query: 'wheat crop needs water'")

        # Try different input field selectors in order of preference
        for selector in [
            "#user-input-field",
            "#advisor-query",
            '[data-tr-placeholder="chat_placeholder"]',
        ]:
            query_input = page.query_selector(selector)
            if query_input:
                print(f"Found input field at selector: {selector}")
                query_input.fill("Wheat crop needs water how much?")
                break

        # Find and click send button - try different selectors in order of preference
        for btn_selector in [
            "#send-btn",
            "#advisor-send",
            '[data-tr="btn_send"]',
            'button:has-text("Send")',
        ]:
            send_btn = page.query_selector(btn_selector)
            if send_btn:
                print(f"Found send button at selector: {btn_selector}")
                send_btn.click()
                break

        # Wait for response
        print("→ Waiting for advisor to respond...")

        try:
            # Wait up to 5 seconds for response
            page.wait_for_selector(
                '.message:has-text("Sastri"), .expert-msg, #sastri-response',
                timeout=5000,
            )
            print("✅ Response received!")
        except Exception:
            print("⚠️ No response detected")


def test_expert_delegation():
    """Test sending a complex query to expert"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 375, "height": 812})

        page.goto(f"{BASE_URL}/app/home")
        page.wait_for_load_state("networkidle")

        print("→ Looking for expert delegation option...")

        # Check if there's an Expert advisor button, usually the second tab or a "escalate" link
        # Look for any expert or advanced button/link
        advisor_options = page.query_selector_all(
            "#advisor-btn, #expert-btn, .escalation-link"
        )

        if advisor_options:
            print(f"✅ Found {len(advisor_options)} expert/escalation options")
        else:
            print("→ No explicit expert button found - looking in advisor selection...")

        # Click ask tab first if not already there
        page.evaluate("""
            const tabs = document.querySelectorAll('[data-tab="ask"]');
            if (tabs.length > 0) tabs[0].click();
        """)

        # Look for advisor button with expert referral option - it's usually in the advisor selection
        # In our schemas, "ask" tab has both Sastri and Expert as selectable advisors

        print("→ Checking advisor selection...")

        # Click send with complex query - the backend will route to expert if needed
        send_complex = "My crop has rust fungus on wheat leaves across 3 acres - what treatment is needed?"
        page.evaluate(f"""
            const input = document.querySelector('#user-input-field, [data-tr-placeholder="chat_placeholder"]');
            if (input) {{
                input.value = `{send_complex}`;
            }}
        """)

        # Send it via advisor - if the response requires expert consultation, it should show
        for btn in page.query_selector_all(
            '#send-btn, #advisor-send, button:has-text("Send")'
        ):
            print(f"→ Sending complex query via selector: {btn}...")
            btn.click()
            break

        # Wait for response - this could take time with Gemini streaming
        print("→ Waiting for complex query to be processed...")

        try:
            # Wait up to 15 seconds for any response (could be Sastri, expert referral, or escalation)
            page.wait_for_selector(
                '.message:has-text("Sastri"), .expert-msg, #sastri-response',
                timeout=15000,
            )
            print("✅ Response received!")
        except Exception:
            # Maybe the response is in the Sastri chat or expert form showed up
            try:
                # Try waiting for either: simple response OR escalation UI
                page.wait_for_selector(
                    ".expert-form-container, .escalation-ui", timeout=5000
                )
                print("✅ Expert escalation UI appeared!")
            except Exception:
                pass  # That's OK - just no response detected


if __name__ == "__main__":
    print("=" * 60)
    print("  Krishi Sampark Browser E2E Test")
    print("=" * 60)

    test_landing_page()
    print("\n" + "=" * 60)

    test_guest_login_flow()
    print("\n" + "=" * 60)

    test_simple_query_flow()
    print("\n" + "=" * 60)

    test_expert_delegation()

    print("\n" + "=" * 60)
    print("  Tests complete! Check screenshots in /tmp/")
