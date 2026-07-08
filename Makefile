.PHONY: setup lint typecheck test test-integration coverage validate-schemas validate-translations validate-safety validate-skills security secret-scan dependency-scan sast container-scan build smoke-test evidence release-check ai-sdlc-check run-agent run-agents firestore-start firestore-stop serve serve-firestore

PYTHON ?= .venv/bin/python
UV ?= uv

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
