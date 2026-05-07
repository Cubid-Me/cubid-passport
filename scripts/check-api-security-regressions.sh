#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

pattern='nextjs-cors|origin:[[:space:]]*["'\'']\*["'\'']|Access-Control-Allow-Origin["'\'']?[[:space:]]*,[[:space:]]*["'\'']\*["'\'']|access-control-allow-origin["'\'']?[[:space:]]*:[[:space:]]*["'\'']\*["'\'']'

targets=(
  "apps/passport/pages/api"
  "apps/admin/pages/api/admin"
  "services/oidc/src"
)

if rg -n --glob '!**/*.test.*' --glob '!**/__tests__/**' "$pattern" "${targets[@]}"; then
  echo
  echo "API security baseline regression detected."
  exit 1
fi

echo "API security baseline regression check passed."
