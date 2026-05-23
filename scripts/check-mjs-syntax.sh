#!/usr/bin/env bash
# check-mjs-syntax.sh
#
# Checks Node.js syntax for all .mjs files in js/src/, scripts/, and js/tests/.
#
# Usage:
#   bash scripts/check-mjs-syntax.sh
#
# Exit code 0 = all files pass syntax check; non-zero = syntax error found.

set -euo pipefail

echo "Checking syntax for all .mjs files..."

CHECKED=0
while IFS= read -r -d '' file; do
  echo "Checking $file..."
  timeout 10s node --check "$file"
  CHECKED=$((CHECKED + 1))
done < <(find js/src scripts js/tests -name "*.mjs" -type f -print0 2>/dev/null)

echo ""
echo "Syntax check passed for $CHECKED file(s)."
