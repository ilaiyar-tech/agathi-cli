import { LayoutCell } from "./layout_engine.js";
import { WidgetRegistry } from "./widget_registry.js";
import { TextLayoutEngine, getCharWidth, getStringWidth } from "./text_layout_engine.js";
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

        const charW = getCharWidth(text[i]);
        if (absoluteX >= minX && absoluteX + charW - 1 <= maxX) {
          if (y >= 0 && y < termHeight && absoluteX < termWidth) {
            screen[y][absoluteX] = {
              char: text[i],
              style: currentStyle
            };
            if (charW === 2 && absoluteX + 1 <= maxX) {
              screen[y][absoluteX + 1] = {
                char: "", // clear adjacent wide cell
                style: currentStyle
              };
            }
          }
        }
        absoluteX += charW;
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
        titleStr = " Chat ";
      } else if (id === "input_bar") {
        titleStr = "";
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

    // Helper to wrap a single chat log entry preserving known prefixes
    function wrapScrollbackEntry(entry: string, w: number): string[] {
      let prefix = "";
      if (entry.startsWith("you ›")) {
        prefix = "you › ";
      } else if (entry.startsWith("து ›")) {
        prefix = "து › ";
      } else if (entry.startsWith("Error ›")) {
        prefix = "Error › ";
      }

      if (prefix) {
        const cleanEntry = entry.substring(prefix.length);
        const prefixWidth = getStringWidth(prefix);
        const wrappedLines = TextLayoutEngine.wrapText(cleanEntry, w, prefixWidth, true);
        if (wrappedLines.length === 0) return [prefix];

        const result: string[] = [prefix + wrappedLines[0]];
        const spaces = " ".repeat(prefixWidth);
        for (let i = 1; i < wrappedLines.length; i++) {
          result.push(spaces + wrappedLines[i]);
        }
        return result;
      } else {
        return TextLayoutEngine.wrapText(entry, w, 0, true);
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
        // Lay out scrollback cleanly using TextLayoutEngine
        const wrappedLogs: string[] = [];
        for (const log of chatScrollback) {
          wrappedLogs.push(...wrapScrollbackEntry(log, width - 4));
        }

        const startIdx = Math.max(0, wrappedLogs.length - contentHeight);
        const visibleLines = wrappedLogs.slice(startIdx);

        for (let idx = 0; idx < contentHeight; idx++) {
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
        if (cell.char === "") continue; // skip wide char extension cell

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
