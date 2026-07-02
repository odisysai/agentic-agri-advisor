.PHONY: setup lint typecheck test test-integration coverage validate-schemas validate-translations validate-safety security secret-scan dependency-scan sast container-scan build smoke-test evidence release-check ai-sdlc-check

PYTHON ?= .venv/bin/python
UV ?= uv

setup:
	$(UV) sync --all-extras --dev

lint:
	$(UV) run ruff check .

typecheck:
	$(UV) run ty check

test:
	$(UV) run pytest tests/ --ignore=scratch/

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

ai-sdlc-check: lint typecheck validate-schemas validate-translations validate-safety coverage secret-scan dependency-scan sast evidence release-check
