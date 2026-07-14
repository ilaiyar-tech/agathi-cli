import { chromium, Browser, Page } from "playwright";

export class BrowserManager {
  private browser: Browser | null = null;
  private cache: Map<string, any> = new Map();

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async extractCleanText(url: string): Promise<string> {
    const cacheKey = `text:${url}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) + "\n\n[CACHED EVIDENCE RETRIEVED]";

    if (!this.browser) await this.init();
    const context = await this.browser!.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        const elements = document.querySelectorAll('script, style');
        elements.forEach(el => el.remove());
      });
      const result = await page.evaluate(() => document.body.innerText);
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async getDOMTree(url: string) {
    const cacheKey = `dom:${url}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    if (!this.browser) await this.init();
    const context = await this.browser!.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const result = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, input'));
        return elements.map(el => ({
          tagName: el.tagName,
          text: (el as HTMLElement).innerText || (el as HTMLInputElement).value || '',
          rect: el.getBoundingClientRect()
        }));
      });
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async captureScreenshot(url: string, path: string) {
    if (!this.browser) await this.init();
    const context = await this.browser!.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path, fullPage: true });
    } finally {
      await page.close();
      await context.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.cache.clear();
  }
}
