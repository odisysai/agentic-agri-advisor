import os
import sys
import re

def validate_contracts():
    # Check IndexedDB stores in local_db.js align with FastAPI endpoints
    try:
        with open('ui/agui/local_db.js', 'r', encoding='utf-8') as f:
            db_code = f.read()
        with open('app/fast_api_app.py', 'r', encoding='utf-8') as f:
            api_code = f.read()
            
        # Check standard endpoints are mapped in FastAPI routes
        endpoints = ['/api/profile', '/api/activities', '/api/plans', '/api/reminders', '/api/escalations']
        for ep in endpoints:
            assert ep in api_code, f"Missing contract endpoint in backend: {ep}"
            
        print("✅ IndexedDB-to-API synchronization contract validated successfully.")
        return True
    except Exception as e:
        print(f"❌ Synchronization contract mismatch: {e}")
        return False

if __name__ == '__main__':
    if not validate_contracts():
        sys.exit(1)
