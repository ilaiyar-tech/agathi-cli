import { chromium, Browser, Page } from "playwright";

export class BrowserManager {
  private browser: Browser | null = null;

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async extractCleanText(url: string): Promise<string> {
    if (!this.browser) await this.init();
    const context = await this.browser!.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        const elements = document.querySelectorAll('script, style');
        elements.forEach(el => el.remove());
      });
      return await page.evaluate(() => document.body.innerText);
    } finally {
      await page.close();
      await context.close();
    }
  }

  async getDOMTree(url: string) {
    if (!this.browser) await this.init();
    const context = await this.browser!.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      return await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, input'));
        return elements.map(el => ({
          tagName: el.tagName,
          text: (el as HTMLElement).innerText || (el as HTMLInputElement).value || '',
          rect: el.getBoundingClientRect()
        }));
      });
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
  }
}
