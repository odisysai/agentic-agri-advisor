from datetime import UTC, datetime

from app.app_utils.user_content_storage import (
    build_user_content_object_name,
    upload_user_content,
)


def test_build_user_content_object_name_uses_user_category_and_month_prefix() -> None:
    object_name = build_user_content_object_name(
        farmer_id="guest_farmer@example.com",
        category="soil_reports",
        file_name="soil report July 2026.pdf",
        now=datetime(2026, 7, 8, tzinfo=UTC),
    )

    assert object_name.startswith(
        "users/guest_farmer_example.com/soil_reports/2026/07/"
    )
    assert object_name.endswith("_soil_report_July_2026.pdf")


def test_upload_user_content_without_bucket_is_not_configured(monkeypatch) -> None:
    monkeypatch.delenv("USER_CONTENT_BUCKET_NAME", raising=False)
    monkeypatch.delenv("CONTENT_BUCKET_NAME", raising=False)
    monkeypatch.delenv("ASSETS_BUCKET_NAME", raising=False)

    result = upload_user_content(
        farmer_id="farmer 1",
        category="crop_photos",
        file_name="leaf.jpg",
        content=b"fake-image",
        content_type="image/jpeg",
    )

    assert result["status"] == "not_configured"
    assert result["bucket"] == ""
    assert result["object_name"].startswith("users/farmer_1/crop_photos/")
    assert result["size_bytes"] == 10
