import json
import os

def generate_matrix():
    matrix = {
        "REQ-AAA-001": {
            "title": "Multilingual UI (English, Hindi, Marathi, Telugu, Swahili)",
            "adr": "ADR-AAA-001",
            "source_files": [
                "ui/agui/translations.js",
                "ui/agui/index.html"
            ],
            "tests": [
                "tests/integration/test_localization.py"
            ],
            "controls": "UX-Localization-Verification"
        },
        "REQ-AAA-002": {
            "title": "Offline-First Operation & Storage",
            "adr": "ADR-AAA-002",
            "source_files": [
                "ui/sw.js",
                "ui/agui/local_db.js"
            ],
            "tests": [
                "tests/integration/test_phase4.py"
            ],
            "controls": "Service-Worker-Verification"
        },
        "REQ-AAA-003": {
            "title": "Voice-First Interaction & STT/TTS",
            "adr": "ADR-AAA-003",
            "source_files": [
                "ui/agui/voice.js"
            ],
            "tests": [
                "tests/integration/test_phase4.py"
            ],
            "controls": "Voice-AutoSpeak-Verification"
        },
        "REQ-AAA-004": {
            "title": "Farmer Mode Dynamic Advisor & AI-Twin Profile",
            "adr": "ADR-AAA-004",
            "source_files": [
                "agents/coordinator/agent.py",
                "ui/agui/dashboard.js"
            ],
            "tests": [
                "tests/integration/test_agent.py"
            ],
            "controls": "Ask-Prompt-Enforcement"
        },
        "REQ-AAA-005": {
            "title": "Agricultural Safety Kernel Advice Audit",
            "adr": "ADR-AAA-005",
            "source_files": [
                "app/fast_api_app.py"
            ],
            "tests": [
                "tests/integration/test_server_e2e.py"
            ],
            "controls": "Safety-Kernel-Escalation"
        },
        "REQ-AAA-006": {
            "title": "Regional Outbreak Intel Map Tracking",
            "adr": "ADR-AAA-006",
            "source_files": [
                "ui/schemas/regional_risk_map.json",
                "ui/agui/expert_dashboards.js"
            ],
            "tests": [
                "tests/integration/test_collapsible_nav.py"
            ],
            "controls": "Outbreak-Triage-Queue"
        },
        "REQ-AAA-007": {
            "title": "Reliable DLQ & Synchronization Queue",
            "adr": "ADR-AAA-007",
            "source_files": [
                "ui/agui/local_db.js",
                "ui/agui/dashboard.js"
            ],
            "tests": [
                "tests/integration/test_phase5.py"
            ],
            "controls": "Sync-Retry-DLQ"
        },
        "REQ-AAA-008": {
            "title": "observability Log Audit Trails",
            "adr": "ADR-AAA-008",
            "source_files": [
                "app/fast_api_app.py",
                "ui/agui/dashboard.js"
            ],
            "tests": [
                "tests/integration/test_phase5.py"
            ],
            "controls": "Log-Audit-Correlation"
        },
        "REQ-AAA-009": {
            "title": "Collapsible Left Navigation Layout",
            "adr": "ADR-AAA-009",
            "source_files": [
                "ui/agui/index.html",
                "ui/agui/dashboard.js"
            ],
            "tests": [
                "tests/integration/test_collapsible_nav.py"
            ],
            "controls": "Layout-Responsive-Checks"
        }
    }
    
    os.makedirs('.ai-sdlc/reports', exist_ok=True)
    with open('.ai-sdlc/reports/traceability-matrix.json', 'w', encoding='utf-8') as f:
        json.dump(matrix, f, indent=4, ensure_ascii=False)
        
    md = "# Requirements Traceability Matrix\n\n"
    md += "| Req ID | Title | ADR | Source Files | Tests | Security & Safety Controls |\n"
    md += "| --- | --- | --- | --- | --- | --- |\n"
    for req_id, data in matrix.items():
        sources = ", ".join(data['source_files'])
        tests = ", ".join(data['tests'])
        md += f"| {req_id} | {data['title']} | {data['adr']} | {sources} | {tests} | {data['controls']} |\n"
        
    with open('.ai-sdlc/reports/traceability-matrix.md', 'w', encoding='utf-8') as f:
        f.write(md)
        
    print("✅ Traceability matrix reports successfully compiled.")
    return True

if __name__ == '__main__':
    generate_matrix()
