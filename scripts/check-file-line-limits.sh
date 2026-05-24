#!/usr/bin/env bash
# check-file-line-limits.sh
#
# Enforces a 1500-line limit on tracked Rust, JavaScript, and Markdown files.
# Markdown files under docs/case-studies/ are exempt because they contain
# preserved research artifacts and external log data.
#
# Usage:
#   bash scripts/check-file-line-limits.sh
#
# Exit code 0 = all files within limit; non-zero = one or more violations.

set -euo pipefail

LIMIT=1500
WARN_THRESHOLD=1350
FAILURES=()
WARNINGS=()
FILES_CHECKED=0

escape_annotation() {
  local value="$1"
  value="${value//'%'/'%25'}"
  value="${value//$'\r'/'%0D'}"
  value="${value//$'\n'/'%0A'}"
  value="${value//':'/'%3A'}"
  value="${value//','/'%2C'}"
  printf '%s' "$value"
}

tracked_files() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files -z
  else
    find . -type f -print0
  fi
}

is_limited_file() {
  case "$1" in
    *.rs | *.js | *.mjs | *.cjs | *.md) return 0 ;;
    *) return 1 ;;
  esac
}

is_exempt_file() {
  case "$1" in
    docs/case-studies/*) return 0 ;;
    .git/* | node_modules/* | target/* | dist/* | coverage/* | build/*)
      return 0
      ;;
    */node_modules/* | */target/* | */dist/* | */coverage/* | */build/*)
      return 0
      ;;
    *) return 1 ;;
  esac
}

echo "Checking tracked Rust, JavaScript, and Markdown files under ${LIMIT} lines..."
echo "Warning threshold: ${WARN_THRESHOLD} lines."
echo "Exempt path: docs/case-studies/"
echo ""

while IFS= read -r -d '' raw_file; do
  file="${raw_file#./}"
  if ! is_limited_file "$file" || is_exempt_file "$file"; then
    continue
  fi

  FILES_CHECKED=$((FILES_CHECKED + 1))
  line_count=$(awk 'END { print NR }' "$file")

  if [ "$line_count" -gt "$LIMIT" ]; then
    echo "ERROR: $file has $line_count lines (limit: ${LIMIT})"
    echo "::error file=$(escape_annotation "$file")::File has $line_count lines (limit: ${LIMIT})"
    FAILURES+=("$file")
  elif [ "$line_count" -gt "$WARN_THRESHOLD" ]; then
    echo "WARNING: $file has $line_count lines (warning threshold: ${WARN_THRESHOLD}; limit: ${LIMIT})"
    echo "::warning file=$(escape_annotation "$file")::File has $line_count lines (warning threshold: ${WARN_THRESHOLD}; limit: ${LIMIT})"
    WARNINGS+=("$file")
  fi
done < <(tracked_files)

echo ""
echo "Checked ${FILES_CHECKED} tracked Rust, JavaScript, and Markdown files."

if [ "${#WARNINGS[@]}" -gt 0 ]; then
  echo "Files above the ${WARN_THRESHOLD}-line warning threshold:"
  printf '  %s\n' "${WARNINGS[@]}"
  echo ""
fi

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "The following files exceed the ${LIMIT} line limit:"
  printf '  %s\n' "${FAILURES[@]}"
  echo ""
  echo "Split oversized files into cohesive modules. Rust, JavaScript, and Markdown files are checked; docs/case-studies/ is exempt."
  exit 1
fi

echo "All checked files are within the ${LIMIT} line limit."
