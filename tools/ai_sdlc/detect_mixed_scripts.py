import sys
from tests.integration.test_localization import test_script_separation_and_leak_prevention

def detect_leaks():
    try:
        test_script_separation_and_leak_prevention()
        print("✅ Mixed script audit successful: Hindi and Telugu scripts strictly separated.")
        return True
    except Exception as e:
        print(f"❌ Mixed script leak detected: {e}")
        return False

if __name__ == '__main__':
    if not detect_leaks():
        sys.exit(1)
