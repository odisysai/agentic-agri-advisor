from argparse import Namespace

from tools.upload_model_assets import resolve_bucket


def test_resolve_assets_bucket_from_project_id() -> None:
    args = Namespace(
        bucket="",
        project_id="my-project",
        project_name="agentic-agri-advisor",
    )

    assert resolve_bucket(args) == "my-project-agentic-agri-advisor-assets"


def test_explicit_assets_bucket_wins() -> None:
    args = Namespace(
        bucket="custom-assets-bucket",
        project_id="my-project",
        project_name="agentic-agri-advisor",
    )

    assert resolve_bucket(args) == "custom-assets-bucket"
