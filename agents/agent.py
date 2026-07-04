"""Re-export the root agent for ADK CLI discovery.

The real coordinator agent lives in ``agents/coordinator/agent.py``.
This module makes ``root_agent`` discoverable at the package level so
``agents-cli`` and the ADK runner resolve the correct entry point.
"""

from agents.coordinator.agent import coordinator_agent as root_agent

__all__ = ["root_agent"]
