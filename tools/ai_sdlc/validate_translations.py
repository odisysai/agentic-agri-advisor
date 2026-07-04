import sys
from tests.integration.test_localization import test_translation_keys_defined, parse_js_dict

def validate_translations():
    try:
        test_translation_keys_defined()
        print("✅ All translation keys perfectly defined across 5 languages.")
        return True
    except Exception as e:
        print(f"❌ Translation validation failed: {e}")
        return False

if __name__ == '__main__':
    if not validate_translations():
        sys.exit(1)
