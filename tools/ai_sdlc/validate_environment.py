import os
import sys

def check_env():
    files = ['.env.example', 'Dockerfile', 'pyproject.toml']
    missing = []
    for f in files:
        if not os.path.exists(f):
            missing.append(f)
            
    if missing:
        print(f"❌ Missing required environment files: {missing}")
        return False
    print("✅ Environment configuration files verified successfully.")
    return True

if __name__ == '__main__':
    if not check_env():
        sys.exit(1)
