#!/usr/bin/env bash
# Thin wrapper: implementation lives in bundle-a2ui.mjs (Windows-safe, single source of truth).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT_DIR/scripts/bundle-a2ui.mjs"
