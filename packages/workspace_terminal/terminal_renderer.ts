import { LayoutCell } from "./layout_engine.js";
import { WidgetRegistry } from "./widget_registry.js";
import chalk from "chalk";

export class TerminalRenderer {
  static drawBuffer(
    cells: LayoutCell[],
    termWidth: number,
    termHeight: number,
    chatScrollback: string[],
    debugMode = false
  ): string {
    // 1. Initialize screen character and style buffer
    const screen: { char: string; style: string }[][] = Array.from({ length: termHeight }, () =>
      Array.from({ length: termWidth }, () => ({ char: " ", style: "" }))
    );

    const borderCombinations: Record<string, Record<string, string>> = {
      "│": { "─": "┼", "┌": "├", "└": "├", "┐": "┤", "┘": "┤", "┬": "┼", "┴": "┼", "├": "┼", "┤": "┼", "┼": "┼" },
      "─": { "│": "┼", "┌": "┬", "┐": "┬", "└": "┴", "┘": "┴", "┬": "┼", "┴": "┼", "├": "┼", "┤": "┼", "┼": "┼" },
      "┌": { "┐": "┬", "└": "├", "┘": "┼", "─": "┬", "│": "├" },
      "┐": { "┌": "┬", "┘": "┤", "└": "┼", "─": "┬", "│": "┤" },
      "└": { "┘": "┴", "┌": "├", "┐": "┼", "─": "┴", "│": "├" },
      "┘": { "└": "┴", "┐": "┤", "┌": "┼", "─": "┴", "│": "┤" },
      "┬": { "┴": "┼", "│": "┼", "─": "┬" },
      "┴": { "┬": "┼", "│": "┼", "─": "┴" },
      "├": { "┤": "┼", "─": "┼", "│": "├" },
      "┤": { "├": "┼", "─": "┼", "│": "┤" },
      "┼": { "┼": "┼" }
    };

    function drawBorderChar(x: number, y: number, char: string, style: string) {
      if (y < 0 || y >= termHeight || x < 0 || x >= termWidth) return;
      const existing = screen[y][x].char;
      let finalChar = char;

      if (borderCombinations[existing] && borderCombinations[existing][char]) {
        finalChar = borderCombinations[existing][char];
      } else if (borderCombinations[char] && borderCombinations[char][existing]) {
        finalChar = borderCombinations[char][existing];
      } else if (existing !== " " && existing !== char) {
        if ("│─┌┐└┘┬┴├┤┼".includes(existing) && "│─┌┐└┘┬┴├┤┼".includes(char)) {
          finalChar = "┼";
        }
      }
      screen[y][x] = { char: finalChar, style };
    }

    // --- Phase 3: Draw borders exactly once ---
    for (const cell of cells) {
      const { x, y, width, height } = cell;
      const style = chalk.gray.dim("");

      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const absoluteY = y + r;
          const absoluteX = x + c;

          if (absoluteY >= termHeight || absoluteX >= termWidth) continue;

          const isTop = r === 0;
          const isBottom = r === height - 1;
          const isLeft = c === 0;
          const isRight = c === width - 1;

          if (isTop && isLeft) drawBorderChar(absoluteX, absoluteY, "┌", style);
          else if (isTop && isRight) drawBorderChar(absoluteX, absoluteY, "┐", style);
          else if (isBottom && isLeft) drawBorderChar(absoluteX, absoluteY, "└", style);
          else if (isBottom && isRight) drawBorderChar(absoluteX, absoluteY, "┘", style);
          else if (isTop || isBottom) drawBorderChar(absoluteX, absoluteY, "─", style);
          else if (isLeft || isRight) drawBorderChar(absoluteX, absoluteY, "│", style);
        }
      }
    }

    // Helper for clipped text printing
    function writeText(x: number, y: number, text: string, minX: number, maxX: number) {
      let currentStyle = "";
      let absoluteX = x;
      let i = 0;

      while (i < text.length) {
        if (text[i] === "\u001b") {
          const mIdx = text.indexOf("m", i);
          if (mIdx !== -1) {
            currentStyle += text.substring(i, mIdx + 1);
            if (text.substring(i, mIdx + 1) === "\u001b[0m") {
              currentStyle = "";
            }
            i = mIdx + 1;
            continue;
          }
        }

        if (absoluteX >= minX && absoluteX <= maxX) {
          if (y >= 0 && y < termHeight && absoluteX < termWidth) {
            screen[y][absoluteX] = {
              char: text[i],
              style: currentStyle
            };
          }
        }
        absoluteX++;
        i++;
      }

      // Pad remaining content area with spaces
      while (absoluteX <= maxX) {
        if (y >= 0 && y < termHeight && absoluteX < termWidth) {
          screen[y][absoluteX] = {
            char: " ",
            style: currentStyle
          };
        }
        absoluteX++;
      }
    }

    // --- Phase 4: Draw titles ---
    for (const cell of cells) {
      const { x, y, width, id } = cell;
      let titleStr = "";
      if (id === "terminal") {
        titleStr = " [ துடுப்பு Workspace Console ] ";
      } else {
        const widget = WidgetRegistry.getWidget(id);
        if (widget) {
          titleStr = ` ${widget.title} `;
        }
      }

      if (titleStr) {
        const titleX = x + Math.floor((width - titleStr.length) / 2);
        writeText(Math.max(x + 1, titleX), y, titleStr, x + 1, x + width - 2);
      }
    }

    // --- Phase 5: Draw widget contents clipped to content area ---
    for (const cell of cells) {
      const { x, y, width, height, id } = cell;
      if (width <= 2 || height <= 2) continue; // No content area

      const minX = x + 1;
      const maxX = x + width - 2;
      const contentHeight = height - 2;

      if (id === "terminal") {
        const maxLines = contentHeight;
        const startIdx = Math.max(0, chatScrollback.length - maxLines);
        const visibleLines = chatScrollback.slice(startIdx);

        for (let idx = 0; idx < maxLines; idx++) {
          const targetY = y + 1 + idx;
          const line = visibleLines[idx];
          if (line !== undefined) {
            writeText(minX + 1, targetY, line, minX, maxX);
          } else {
            writeText(minX, targetY, "", minX, maxX);
          }
        }
      } else {
        const widget = WidgetRegistry.getWidget(id);
        if (widget) {
          const widgetLines = widget.render(width - 2, height - 2);
          for (let idx = 0; idx < contentHeight; idx++) {
            const targetY = y + 1 + idx;
            const line = widgetLines[idx];
            if (line !== undefined) {
              writeText(minX, targetY, line, minX, maxX);
            } else {
              writeText(minX, targetY, "", minX, maxX);
            }
          }
        }
      }
    }

    // --- Debug mode rendering ---
    if (debugMode) {
      for (const cell of cells) {
        let name = cell.id === "terminal" ? "Terminal" : (WidgetRegistry.getWidget(cell.id)?.title || cell.id);
        const debugStr = `[${name}: x=${cell.x}, y=${cell.y}, w=${cell.width}, h=${cell.height}]`;
        console.log(chalk.yellow(`[DEBUG LAYOUT] ${debugStr} Content: [${cell.x + 1}..${cell.x + cell.width - 2}, ${cell.y + 1}..${cell.y + cell.height - 2}]`));
      }
    }

    // Assemble final output
    let result = [];
    for (let r = 0; r < termHeight; r++) {
      let rowStr = "";
      let activeStyle = "";
      for (let c = 0; c < termWidth; c++) {
        const cell = screen[r][c];
        if (cell.style !== activeStyle) {
          if (activeStyle) {
            rowStr += "\u001b[0m";
          }
          activeStyle = cell.style;
          if (activeStyle) {
            rowStr += activeStyle;
          }
        }
        rowStr += cell.char;
      }
      if (activeStyle) {
        rowStr += "\u001b[0m";
      }
      result.push(rowStr);
    }
    return result.join("\n");
  }
}
