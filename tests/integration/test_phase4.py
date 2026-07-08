import requests

from tests.integration.test_server_e2e import BASE_URL, HEADERS


def test_phase4_endpoints(server_fixture) -> None:
    """Test all Phase 4 endpoints on the FastAPI server."""

    # 1. Test plans endpoints
    response_plans = requests.get(f"{BASE_URL}/api/plans/planting_1", timeout=10)
    assert response_plans.status_code == 200
    plans_data = response_plans.json()
    assert plans_data["status"] == "success"
    assert len(plans_data["plans"]) >= 2  # plans seeded in Firestore

    # Complete a plan task
    complete_payload = {"plan_id": "plan_1", "state": "completed"}
    complete_res = requests.post(
        f"{BASE_URL}/api/plans/complete",
        json=complete_payload,
        headers=HEADERS,
        timeout=10,
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "success"

    # 2. Test reminders endpoints
    response_reminders = requests.get(
        f"{BASE_URL}/api/reminders/planting_1", timeout=10
    )
    assert response_reminders.status_code == 200
    reminders_data = response_reminders.json()
    assert reminders_data["status"] == "success"
    assert len(reminders_data["reminders"]) >= 1  # reminders seeded in Firestore

    # Snooze a reminder
    reminder_payload = {"reminder_id": "rem_1", "state": "snoozed"}
    reminder_res = requests.post(
        f"{BASE_URL}/api/reminders/action",
        json=reminder_payload,
        headers=HEADERS,
        timeout=10,
    )
    assert reminder_res.status_code == 200
    assert reminder_res.json()["status"] == "success"

    # 3. Test escalations endpoints
    escalation_payload = {
        "escalation_id": "esc_test_1",
        "planting_id": "planting_1",
        "farmer_question": "Leaves turn red, is it rust?",
        "language": "Hindi",
        "translated_summary": "Leaves turning red",
        "field_context": "North Hillside",
        "crop_context": "Corn",
        "images": "[]",
        "diagnosis_result": "Common Rust",
        "confidence": 0.85,
        "safety_flags": "none",
        "recent_activities": "Watered yesterday",
        "state": "submitted",
        "expert_response": "",
    }
    esc_res = requests.post(
        f"{BASE_URL}/api/escalations",
        json=escalation_payload,
        headers=HEADERS,
        timeout=10,
    )
    assert esc_res.status_code == 200
    assert esc_res.json()["status"] == "success"

    # Get escalations
    get_esc_res = requests.get(f"{BASE_URL}/api/escalations/planting_1", timeout=10)
    assert get_esc_res.status_code == 200
    esc_list = get_esc_res.json()["escalations"]
    assert len(esc_list) >= 1
    assert esc_list[0]["escalation_id"] == "esc_test_1"

    # 4. Test outcomes feedback loop
    feedback_payload = {
        "feedback_id": "feed_test_1",
        "planting_id": "planting_1",
        "followed_recommendation": 1,
        "outcome": "improved",
        "time_to_outcome": "3 days",
        "comment": "Leaves look much greener now!",
        "farmer_confidence": 0.95,
    }
    feed_res = requests.post(
        f"{BASE_URL}/api/feedback", json=feedback_payload, headers=HEADERS, timeout=10
    )
    assert feed_res.status_code == 200
    assert feed_res.json()["status"] == "success"
