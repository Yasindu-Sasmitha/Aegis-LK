"""
conftest.py — pytest session configuration for agentic-ai/tests/

Adds the sibling `agents/` directory to sys.path BEFORE any test module is
collected. This means:
  - pytest finds recovery_agent, weather_agent, etc. without manual sys.path hacks
  - IDE language servers (Pylance / pylint) resolve imports correctly when the
    workspace root is set to `agentic-ai/`
"""

import sys
from pathlib import Path

# agentic-ai/agents/
agents_dir = Path(__file__).resolve().parent.parent / "agents"
if str(agents_dir) not in sys.path:
    sys.path.insert(0, str(agents_dir))
