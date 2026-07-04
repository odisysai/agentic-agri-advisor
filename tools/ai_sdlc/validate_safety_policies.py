import os
import sys

def validate_safety():
    # Ensure that any advisor agent code references 'escalate' or checks boundaries
    try:
        with open('agents/coordinator/agent.py', 'r', encoding='utf-8') as f:
            agent_code = f.read()
            
        assert 'escalate' in agent_code or 'safety' in agent_code.lower(), "Safety Kernel escalation path missing from coordinator instructions"
        print("✅ Agricultural Safety Kernel compliance validated successfully.")
        return True
    except Exception as e:
        print(f"❌ Safety Kernel policy violation: {e}")
        return False

if __name__ == '__main__':
    if not validate_safety():
        sys.exit(1)
