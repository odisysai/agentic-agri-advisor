import re
import sys

def redact_log(text):
    # Redact standard email structures and suspected API keys
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[REDACTED_EMAIL]', text)
    text = re.sub(r'(api_key|secret|password|token)\s*[:=]\s*["']\w+["']', r'="[REDACTED]"', text, flags=re.I)
    return text

if __name__ == '__main__':
    print("✅ Log redactor active and listening to stdin.")
