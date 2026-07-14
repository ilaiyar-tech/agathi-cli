#!/bin/bash
# Patching interactive shell to support browser commands
cat << 'END' > apps/cli/commands/browser.ts
import { browser_manager } from '../../../packages/browser/browser_manager';

export const browserCommands = {
    async fetch(url: string) {
        console.log(`Navigating to ${url}...`);
        const content = await browser_manager.fetch(url);
        console.log('Page Content:', content);
    }
};
END

# Registering to interactive shell (simplified append)
sed -i '/import { browserCommands }/d' apps/cli/interactive.ts
sed -i '1i import { browserCommands } from "./commands/browser";' apps/cli/interactive.ts
echo "Stage 6 Browser Engine Hooked."
