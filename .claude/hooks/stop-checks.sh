#!/usr/bin/env bash
# Stop hook: before an agent finishes, lint and type-check the project.
# Exit 2 sends the failure back to the agent so it fixes it instead of stopping.
set -uo pipefail
input=$(cat)
# Avoid loops: if this stop was already triggered by this hook, let it through.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
# Nothing changed since the last commit: nothing to check.
if git diff --quiet HEAD -- 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then exit 0; fi
out=$( { npm run -s lint && npm run -s check; } 2>&1 )
if [ $? -ne 0 ]; then
  printf 'Stop blocked: lint or type check failed. Fix these before finishing:\n%s\n' "$(printf '%s' "$out" | tail -40)" >&2
  exit 2
fi
exit 0
