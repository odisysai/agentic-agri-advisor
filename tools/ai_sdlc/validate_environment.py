import os
import sys


def check_env():
    # Files that must exist in the project root for a valid environment
    files = ["config/secrets.template.env", "Dockerfile", "pyproject.toml", "Makefile"]
    missing = []
    for f in files:
        if not os.path.exists(f):
            missing.append(f)

    if missing:
        print(f"❌ Missing required project files: {missing}")
        return False

    # Check that .env exists (from secrets.template.env) or GEMINI_API_KEY is set
    has_env_file = os.path.exists(".env")
    has_api_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    if not has_env_file and not has_api_key:
        print("⚠️  WARNING: No .env file found and GEMINI_API_KEY not set.")
        print("   Copy config/secrets.template.env to .env and set GEMINI_API_KEY.")

    print("✅ Environment configuration verified.")
    return True


if __name__ == "__main__":
    if not check_env():
        sys.exit(1)
