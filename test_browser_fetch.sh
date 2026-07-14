#!/bin/bash
# Agathi-CLI Browser Automation Test
# This triggers the browser_manager to fetch a local "test-page" 
# or a documentation page you've built.
node dist/apps/cli/index.js browser fetch --target="local"
