import { chromium, Browser, Page } from "playwright";

export class browser_manager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.page = await this.browser.newPage();
    }
  }

  async fetch(url: string): Promise<string> {
    await this.init();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto(url, { waitUntil: "networkidle" });
    const content = await this.page.evaluate(() => {
      // Basic text extraction to avoid sending full HTML if not needed
      return document.body.innerText;
    });

    return content;
  }

  async screenshot(url: string, path: string): Promise<void> {
    await this.init();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto(url, { waitUntil: "networkidle" });
    await this.page.screenshot({ path, fullPage: true });
  }

  async extractCleanText(url: string): Promise<string> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        const elements = document.querySelectorAll('script, style');
        elements.forEach(el => el.remove());
      });
      const cleanText = await page.evaluate(() => document.body.innerText);
      return cleanText;
    } catch (error) {
      console.error(`Failed text extraction for ${url}:`, error);
      throw error;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export const browsers = new browser_manager();
