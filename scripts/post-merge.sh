#!/bin/bash
set -e
npm install
timeout 10 npx drizzle-kit push --force 2>&1 || echo "drizzle-kit push skipped or timed out (non-fatal)"
