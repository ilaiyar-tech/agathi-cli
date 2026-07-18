import { LayoutCell } from "./layout_engine.js";
import { WidgetRegistry } from "./widget_registry.js";
import chalk from "chalk";

export class TerminalRenderer {
  static drawBuffer(cells: LayoutCell[], termWidth: number, termHeight: number, chatScrollback: string[]): string {
    // Initialize empty screen char buffer
    const screen: string[][] = Array.from({ length: termHeight }, () =>
      Array.from({ length: termWidth }, () => " ")
    );

    // Draw borders & contents for each cell
    for (const cell of cells) {
      const { x, y, width, height, id } = cell;

      // Draw borders
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const absoluteY = y + r;
          const absoluteX = x + c;

          if (absoluteY >= termHeight || absoluteX >= termWidth) continue;

          // Border outlines
          const isTop = r === 0;
          const isBottom = r === height - 1;
          const isLeft = c === 0;
          const isRight = c === width - 1;

          if (isTop && isLeft) screen[absoluteY][absoluteX] = "┌";
          else if (isTop && isRight) screen[absoluteY][absoluteX] = "┐";
          else if (isBottom && isLeft) screen[absoluteY][absoluteX] = "└";
          else if (isBottom && isRight) screen[absoluteY][absoluteX] = "┘";
          else if (isTop || isBottom) screen[absoluteY][absoluteX] = "─";
          else if (isLeft || isRight) screen[absoluteY][absoluteX] = "│";
        }
      }

      // Draw title & contents
      if (id === "terminal") {
        // Draw title
        const titleStr = " [ துடுப்பு Workspace Console ] ";
        const titleX = x + Math.floor((width - titleStr.length) / 2);
        if (titleX > x) {
          for (let i = 0; i < titleStr.length; i++) {
            screen[y][titleX + i] = titleStr[i];
          }
        }

        // Draw conversation logs inside terminal box
        const maxLines = height - 3;
        const startIdx = Math.max(0, chatScrollback.length - maxLines);
        const visibleLines = chatScrollback.slice(startIdx);

        visibleLines.forEach((line, idx) => {
          const targetY = y + 1 + idx;
          if (targetY < y + height - 2) {
            // Strip ANSI codes just for spacing calculations, then write characters
            const cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
            const len = Math.min(width - 4, cleanLine.length);
            // We write characters directly. To support rich colors, we format the entire line and fit it.
            // For simplicity in the buffer, print visible chunk:
            const padLen = Math.max(0, width - 4 - len);
            const formatted = "  " + line.substring(0, width - 4) + " ".repeat(padLen);
            // Write formatted string as array cells
            let writeIdx = 0;
            for (let c = 2; c < width - 2; c++) {
              if (x + c < termWidth && writeIdx < formatted.length) {
                screen[targetY][x + c] = formatted[writeIdx++];
              }
            }
          }
        });
      } else {
        const widget = WidgetRegistry.getWidget(id);
        if (widget) {
          // Draw Widget Title
          const titleStr = ` ${widget.title} `;
          for (let i = 0; i < Math.min(width - 4, titleStr.length); i++) {
            screen[y][x + 2 + i] = titleStr[i];
          }

          // Draw Widget content
          const widgetLines = widget.render(width - 2, height - 2);
          widgetLines.forEach((line, idx) => {
            const targetY = y + 1 + idx;
            if (targetY < y + height - 1) {
              const cleanLine = line.substring(0, width - 2);
              for (let c = 0; c < cleanLine.length; c++) {
                if (x + 1 + c < termWidth - 1) {
                  screen[targetY][x + 1 + c] = cleanLine[c];
                }
              }
            }
          });
        }
      }
    }

    // Assemble final output
    return screen.map(row => row.join("")).join("\n");
  }
}
