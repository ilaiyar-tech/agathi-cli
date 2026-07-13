import { BrowserManager } from "../../../packages/browser/browser_manager.js";

const browser_manager = new BrowserManager();
export const browserCommands = {
    async fetch(url: string) {
        console.log(`Navigating to ${url}...`);
        const content = await browser_manager.extractCleanText(url);
        console.log('Page Content:', content);
    }
};
