#!/bin/bash
set -e
npm install
timeout 15 npx drizzle-kit push --force 2>&1 || true
