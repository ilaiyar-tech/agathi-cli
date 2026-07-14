#!/bin/bash
echo "--- Initializing Agathi AI Dashboard ---"
# Check if the required build exists
if [ ! -d "dist" ]; then
    echo "Build not found. Running build..."
    npm run build
fi

# Launching the interface
npx tsx apps/dashboard/src/main.ts
