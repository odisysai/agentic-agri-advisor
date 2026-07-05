import json
import os
import sys


def validate_a2ui_schemas():
    schema_dir = "ui/schemas"
    errors = []

    approved_components = {
        # Core layout
        "text",
        "grid",
        "section",
        "card",
        "header",
        # Data display
        "metric",
        "metric_card",
        "chart",
        "list",
        "table",
        "status_card",
        "alert_card",
        "greeting",
        # Interactive
        "form",
        "input",
        "textarea",
        "select",
        "number",
        "button",
        "buttons",
        "actions",
        "action_bar",
        "action_card",
        "option_grid",
        # A2UI specific
        "image",
        "camera",
        "voice",
        "toggle",
        "badge",
        "divider",
        "tabs",
        "modal",
    }

    if not os.path.exists(schema_dir):
        print(f"Schema directory {schema_dir} does not exist.")
        return False

    for fname in os.listdir(schema_dir):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(schema_dir, fname)
        try:
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)

            if "type" not in data:
                errors.append(f"{fname}: Missing root 'type'")
                continue

            def check_components(o, _fname=fname):
                if isinstance(o, dict):
                    if "type" in o and o["type"] not in approved_components:
                        errors.append(
                            f"{_fname}: Unapproved component type '{o['type']}'"
                        )
                    # Check for inline JS or arbitrary script injections
                    for k, v in o.items():
                        if isinstance(v, str):
                            if "javascript:" in v.lower() or "<script" in v.lower():
                                errors.append(
                                    f"{_fname}: Script injection detected in property '{k}': {v}"
                                )
                    for v in o.values():
                        check_components(v, _fname)
                elif isinstance(o, list):
                    for item in o:
                        check_components(item, _fname)

            check_components(data)

        except Exception as e:
            errors.append(f"{fname}: Failed to parse JSON: {e}")

    if errors:
        print("--- A2UI Schema Validation Failures ---")
        for err in errors:
            print(f"❌ {err}")
        return False

    print("✅ All A2UI schemas successfully validated.")
    return True


if __name__ == "__main__":
    if not validate_a2ui_schemas():
        sys.exit(1)
