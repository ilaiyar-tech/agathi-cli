import { LayoutEngine, LayoutValidator, LayoutCell } from "./layout_engine.js";
import { TerminalRenderer } from "./terminal_renderer.js";

export class RenderManager {
  private static isDrawPending = false;
  private static lastFrame = "";
  private static lastWidth = 0;
  private static lastHeight = 0;
  private static activeRl: any = null;
  private static scrollback: string[] = [];
  private static debugMode = process.env.TUI_DEBUG === "true";

  static setActiveRl(rl: any) {
    this.activeRl = rl;
  }

  static addLog(msg: string) {
    this.scrollback.push(msg);
    this.queueDraw();
  }

  static getScrollback(): string[] {
    return this.scrollback;
  }

  static clearScrollback() {
    this.scrollback = [];
    this.queueDraw();
  }

  static queueDraw() {
    if (this.isDrawPending) return;
    this.isDrawPending = true;

    setImmediate(() => {
      this.isDrawPending = false;
      this.performDraw();
    });
  }

  static forceRedraw() {
    this.lastFrame = "";
    this.queueDraw();
  }

  private static performDraw() {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    this.lastWidth = width;
    this.lastHeight = height;

    let cells = LayoutEngine.computeLayout(width, height);
    const validation = LayoutValidator.validate(cells, width, height);
    if (!validation.valid) {
      this.scrollback.push(`[TUI Warning] Layout validation failed: ${validation.reason}. Falling back to default layout.`);
      cells = LayoutEngine.getFallbackLayout(width, height);
    }

    const output = TerminalRenderer.drawBuffer(cells, width, height, this.scrollback, this.debugMode);

    if (output === this.lastFrame) {
      this.repositionCursor(cells);
      return;
    }

    this.lastFrame = output;
    
    // Single stdout.write call for drawing the entire frame
    process.stdout.write("\x1b[H\x1b[2J" + output);

    this.repositionCursor(cells);
  }

  private static repositionCursor(cells: LayoutCell[]) {
    const inputCell = cells.find(c => c.id === "input_bar");
    if (inputCell) {
      const promptY = inputCell.y + 1;
      const promptX = inputCell.x + 2;
      process.stdout.write(`\x1b[${promptY + 1};${promptX + 1}H`);
    }

    if (this.activeRl) {
      if (typeof this.activeRl._refreshLine === "function") {
        this.activeRl._refreshLine();
      } else if (typeof this.activeRl.prompt === "function") {
        this.activeRl.prompt(true);
      }
    }
  }

  static handleResize() {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    if (width === this.lastWidth && height === this.lastHeight) {
      return;
    }
    this.forceRedraw();
  }
}
