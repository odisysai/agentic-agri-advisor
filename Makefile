.PHONY: setup lint typecheck test test-integration coverage validate-schemas validate-translations validate-safety validate-skills security secret-scan dependency-scan sast container-scan build smoke-test evidence release-check ai-sdlc-check run-agent run-agents firestore-start firestore-stop serve serve-firestore dev serve-ui browser-test check-language

PYTHON ?= .venv/bin/python
UV ?= env UV_CACHE_DIR=.uv-cache uv

setup:
	$(UV) sync --all-extras --dev

lint:
	$(UV) run agents-cli lint

typecheck:
	$(UV) run ty check

test:
	$(UV) run pytest tests/ --ignore=tests/integration/ --ignore=scratch/

test-integration:
	$(UV) run pytest tests/integration/ --ignore=scratch/

coverage:
	$(UV) run python -m tools.ai_sdlc.cli test --evidence

validate-schemas:
	$(UV) run python -m tools.ai_sdlc.cli validate --schemas

validate-translations:
	$(UV) run python -m tools.ai_sdlc.cli validate --translations

validate-safety:
	$(UV) run python -m tools.ai_sdlc.cli validate --safety

validate-skills:
	$(UV) run python -m tools.ai_sdlc.cli validate --skills

security:
	$(UV) run python -m tools.ai_sdlc.cli security --all

secret-scan:
	$(UV) run python -m tools.ai_sdlc.cli security --secrets

dependency-scan:
	$(UV) run python -m tools.ai_sdlc.cli security --dependencies

sast:
	$(UV) run python -m tools.ai_sdlc.cli security --sast

container-scan:
	$(UV) run python -m tools.ai_sdlc.cli security --container

build:
	docker build -t krishi-sampark:latest .

smoke-test:
	$(UV) run python -m tools.ai_sdlc.validate_environment

evidence:
	$(UV) run python -m tools.ai_sdlc.cli evidence --verify

release-check:
	$(UV) run python -m tools.ai_sdlc.cli release --report

ai-sdlc-check: lint typecheck validate-schemas validate-translations validate-safety validate-skills coverage secret-scan dependency-scan sast evidence release-check

# Run lifecycle agents (declarative → executable)
run-agent:
	$(UV) run python -m tools.ai_sdlc.run_agent --agent $(AGENT)

run-agents:
	$(UV) run python -m tools.ai_sdlc.run_agent --agent all

# ═══════════════════════════════════════════════════════════
# Firestore Emulator (local development)
# ═══════════════════════════════════════════════════════════

firestore-start:
	@echo "Starting Firestore Emulator on localhost:8081..."
	@gcloud beta emulators firestore start --host-port=localhost:8081 &
	@sleep 3
	@echo "Firestore Emulator running at http://localhost:8081"
	@echo "Set: export FIRESTORE_EMULATOR_HOST=localhost:8081"

firestore-stop:
	@pkill -f "cloud-firestore-emulator" 2>/dev/null || true
	@echo "Firestore Emulator stopped"

# Serve with Firestore Emulator (local dev)
serve:
	@echo "Starting FastAPI with Firestore Emulator..."
	FIRESTORE_EMULATOR_HOST=localhost:8081 \
	FIRESTORE_PROJECT_ID=emulator-project \
	USE_FIRESTORE=1 \
	$(UV) run uvicorn app.fast_api_app:app --port 8000 --reload

# Backward-compatible alias while docs/scripts converge on `make serve`.
serve-firestore: serve

# ═══════════════════════════════════════════════════════════
# Developer convenience targets
# ═══════════════════════════════════════════════════════════

# Start everything: Firestore emulator + FastAPI server (one command)
dev:
	@echo "Starting Firestore Emulator..."
	@gcloud beta emulators firestore start --host-port=localhost:8081 & \
		sleep 3 && \
		FIRESTORE_EMULATOR_HOST=localhost:8081 \
		FIRESTORE_PROJECT_ID=emulator-project \
		USE_FIRESTORE=1 \
		$(UV) run uvicorn app.fast_api_app:app --port 8000 --reload

# Serve only the UI as static files (no backend — for frontend-only work)
serve-ui:
	@echo "Serving static frontend at http://localhost:8080"
	@echo "NOTE: API calls will fail — agent chat requires make serve"
	$(UV) run python -m http.server 8080 --directory ui/

# Run browser-based Playwright E2E tests (server must be running first)
browser-test:
	@echo "Running browser E2E tests (ensure 'make serve' is running)"
	$(UV) run playwright install chromium --quiet 2>/dev/null || true
	$(UV) run python test_real_browser.py

# Audit language support completeness for a given language code
# Usage: make check-language LANG=kn NAME=Kannada
check-language:
	@test -n "$(LANG)" || (echo "Usage: make check-language LANG=<code> NAME=<Language>"; exit 1)
	$(UV) run python tools/scaffold/add_language.py --code $(LANG) --name $(or $(NAME),Unknown)
