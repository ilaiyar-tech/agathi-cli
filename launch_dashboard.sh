#!/bin/bash
fuser -k 8100/tcp 2>/dev/null
npm run build
npx tsx dashboard.ts
