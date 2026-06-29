#!/usr/bin/env bash
set -euo pipefail

# Release/runtime paths only. Documentation and tests can retain upstream history
# without shipping those URLs in the desktop product.
scan_paths=(
  "apps/codex-plus-manager/src"
  "apps/codex-plus-manager/src-tauri/src"
  "apps/codex-plus-manager/src-tauri/tauri.conf.json"
  "assets/inject"
  "crates/codex-plus-core/src"
  "scripts/installer"
)

forbidden_patterns=(
  "github.com/BigPizzaV3/CodexPlusPlus"
  "raw.githubusercontent.com/BigPizzaV3"
  "cdn.jsdelivr.net/gh/BigPizzaV3"
  "jojocode.com"
  "aigocode.com"
  "packyapi.com"
  "apikey.fun"
  "runapi.co"
  "aihub2api.cloud"
  "maolaoapi.com"
  "unity2.ai"
)

for pattern in "${forbidden_patterns[@]}"; do
  if rg --fixed-strings --quiet \
    --glob '!target/**' \
    --glob '!node_modules/**' \
    --glob '!LEISHEN_UPSTREAM_BASE/**' \
    -- "$pattern" "${scan_paths[@]}"; then
    echo "Forbidden third-party URL found: $pattern"
    exit 1
  fi
done

echo "Leishen release URL audit passed."
