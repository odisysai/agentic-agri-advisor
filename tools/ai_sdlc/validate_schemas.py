import os
import json
import sys

def validate_a2ui_schemas():
    schema_dir = 'ui/schemas'
    errors = []
    
    approved_components = {
        "text", "grid", "metric", "chart", "form", "input", "button", "section", "card",
        "option_grid", "metric_card", "alert_card", "action_bar", "status_card"
    }
    
    if not os.path.exists(schema_dir):
        print(f"Schema directory {schema_dir} does not exist.")
        return False
        
    for fname in os.listdir(schema_dir):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(schema_dir, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'type' not in data:
                errors.append(f"{fname}: Missing root 'type'")
                continue
                
            def check_components(o):
                if isinstance(o, dict):
                    if 'type' in o and o['type'] not in approved_components:
                        errors.append(f"{fname}: Unapproved component type '{o['type']}'")
                    # Check for inline JS or arbitrary script injections
                    for k, v in o.items():
                        if isinstance(v, str):
                            if 'javascript:' in v.lower() or '<script' in v.lower():
                                errors.append(f"{fname}: Script injection detected in property '{k}': {v}")
                    for v in o.values():
                        check_components(v)
                elif isinstance(o, list):
                    for item in o:
                        check_components(item)
                        
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

if __name__ == '__main__':
    if not validate_a2ui_schemas():
        sys.exit(1)
