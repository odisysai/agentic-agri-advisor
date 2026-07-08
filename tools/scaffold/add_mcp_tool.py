#!/usr/bin/env python3
"""
MCP tool server scaffolding for Krishi Sampark.

Creates the boilerplate for a new MCP tool server and prints the
registration entries needed for mcp_registry.json and the target agent.

Usage:
    python tools/scaffold/add_mcp_tool.py --name soil-sensors --description "Exposes soil sensor readings from IoT devices."
    python tools/scaffold/add_mcp_tool.py --name soil-sensors --description "..." --agent crop_analyst

Reference:
    .context/05-add-mcp-tool.md — detailed guide
    .context/change-maps/add-mcp-tool.yaml — file checklist
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


def _snake(name: str) -> str:
    """Convert kebab-case or spaces to snake_case."""
    return re.sub(r"[-\s]+", "_", name.strip().lower())


def _pascal(name: str) -> str:
    return "".join(w.capitalize() for w in re.split(r"[-_\s]+", name.strip()))


SERVER_TEMPLATE = '''\
"""
{description}

MCP Tool: {name}
Reference: .context/05-add-mcp-tool.md
"""
from __future__ import annotations

import os

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("{name}")


@mcp.tool()
def get_{snake_name}_data(query: str) -> dict:
    """Get {name} data for the given query.

    The agent calls this tool when the farmer asks about {description_lower}.

    Args:
        query: The farmer\'s question or data request.

    Returns:
        A dict with status and result keys.
    """
    # TODO: Implement real logic here
    # For local/offline fallback, return a safe default
    return {{
        "status": "success",
        "result": "TODO: implement {name} response for query: " + query,
        "source": "{name}",
    }}


if __name__ == "__main__":
    mcp.run(transport="stdio")
'''

REGISTRY_ENTRY = '''\
  "{name}": {{
    "type": "stdio",
    "command": "python",
    "args": ["mcp_servers/{name}/server.py"],
    "description": "{description}"
  }}'''

AGENT_IMPORT = '''\
from mcp_servers.{snake_name}.server import get_{snake_name}_data'''

AGENT_TOOLS_HINT = '''\
# In agents/{agent}/agent.py, add to tools=[]:
#   get_{snake_name}_data,
# Also update the agent instruction to describe when to call this tool.'''

TEST_TEMPLATE = '''\
"""Unit tests for the {name} MCP tool server."""
import pytest

from mcp_servers.{snake_name}.server import get_{snake_name}_data


def test_get_{snake_name}_data_happy_path():
    result = get_{snake_name}_data("test query")
    assert result["status"] == "success"
    assert "result" in result


def test_get_{snake_name}_data_empty_query():
    result = get_{snake_name}_data("")
    assert result["status"] in ("success", "error")
'''


def scaffold(name: str, description: str, agent: str | None) -> None:
    snake_name = _snake(name)
    server_dir = ROOT / "mcp_servers" / name
    test_dir = ROOT / "tests" / "unit" / "mcp_servers"

    # Create server directory
    server_dir.mkdir(parents=True, exist_ok=True)
    init_path = server_dir / "__init__.py"
    server_path = server_dir / "server.py"
    test_path = test_dir / f"test_{snake_name}.py"

    if server_path.exists():
        print(f"WARNING: {server_path} already exists. Skipping creation.")
    else:
        init_path.write_text("", encoding="utf-8")
        server_path.write_text(
            SERVER_TEMPLATE.format(
                name=name,
                snake_name=snake_name,
                description=description,
                description_lower=description.lower().rstrip("."),
            ),
            encoding="utf-8",
        )
        print(f"  Created: mcp_servers/{name}/server.py")
        print(f"  Created: mcp_servers/{name}/__init__.py")

    # Create test file
    test_dir.mkdir(parents=True, exist_ok=True)
    test_init = test_dir / "__init__.py"
    if not test_init.exists():
        test_init.write_text("", encoding="utf-8")

    if test_path.exists():
        print(f"WARNING: {test_path} already exists. Skipping.")
    else:
        test_path.write_text(
            TEST_TEMPLATE.format(name=name, snake_name=snake_name),
            encoding="utf-8",
        )
        print(f"  Created: tests/unit/mcp_servers/test_{snake_name}.py")

    # Print registry and agent instructions
    print()
    print("═" * 60)
    print("NEXT: Add to mcp_servers/mcp_registry.json (inside mcp_servers dict):")
    print("═" * 60)
    print(REGISTRY_ENTRY.format(name=name, description=description))
    print()

    if agent:
        target = _snake(agent)
        print("═" * 60)
        print(f"NEXT: Wire to agents/{target}/agent.py:")
        print("═" * 60)
        print(AGENT_IMPORT.format(snake_name=snake_name))
        print(AGENT_TOOLS_HINT.format(snake_name=snake_name, agent=target))
        print()

    print("═" * 60)
    print("NEXT: Update agents/AGENTS.md MCP tools table.")
    print()
    print("VALIDATE:")
    print(f"  python -c \"import ast; ast.parse(open('mcp_servers/{name}/server.py').read()); print('OK')\"")
    print(f"  uv run python -c \"from mcp_servers.{snake_name}.server import get_{snake_name}_data; print('OK')\"")
    print("  make test")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scaffold a new MCP tool server for Krishi Sampark.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--name", required=True, help="Tool name in kebab-case (e.g. soil-sensors)")
    parser.add_argument("--description", required=True, help="One-line description of what this tool does")
    parser.add_argument("--agent", default=None, help="Target agent name (e.g. crop_analyst) to wire the tool to")

    args = parser.parse_args()

    name = args.name.strip().lower()
    if not re.match(r"^[a-z][a-z0-9-]+$", name):
        print(f"ERROR: --name must be kebab-case lowercase (e.g. soil-sensors), got: {name!r}", file=sys.stderr)
        sys.exit(2)

    existing = [p.name for p in (ROOT / "mcp_servers").iterdir() if p.is_dir() and not p.name.startswith("_")]
    if name in existing:
        print(f"ERROR: mcp_servers/{name}/ already exists. Choose a different name.", file=sys.stderr)
        sys.exit(2)

    print(f"Scaffolding MCP tool: {name}")
    scaffold(args.name, args.description, args.agent)


if __name__ == "__main__":
    main()
