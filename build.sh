#!/usr/bin/env bash
# Keep credential declarations out of shell tracing and build logs.
set +x
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
source ./key.sh
export APP_ID APP_SECRET
exec bun ./scripts/build.ts
