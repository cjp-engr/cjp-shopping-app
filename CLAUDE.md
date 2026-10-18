@AGENTS.md

# Claude Code notes

- The rules in AGENTS.md are binding. In particular: do not touch Playwright or Patrol, do not commit or push unless asked, never use port 27017 for tests, never print secrets, and change only files inside the codebase. System, network, global-install, Docker and shell-profile changes are done by a human, never by the agent: describe the exact steps and let the owner do them.
- Skill workflows (subagent-driven development, plans) must follow AGENTS.md: no commits, no Playwright/Patrol steps, even if a skill or plan says to commit or to run them.
