import { WidgetRegistry } from "./widget_registry.js";

export interface LayoutCell {
  id: string; // widget ID, 'terminal' or 'input_bar'
  x: number;
  y: number;
  width: number;
  height: number;
}

export class LayoutValidator {
  static validate(cells: LayoutCell[], termWidth: number, termHeight: number): { valid: boolean; reason?: string } {
    if (cells.length === 0) {
      return { valid: false, reason: "No cells defined in layout." };
    }

    for (const cell of cells) {
      if (cell.width <= 0 || cell.height <= 0) {
        return { valid: false, reason: `Cell ${cell.id} has negative or zero size: ${cell.width}x${cell.height}` };
      }

      if (cell.x < 0 || cell.y < 0 || cell.x + cell.width > termWidth || cell.y + cell.height > termHeight) {
        return { 
          valid: false, 
          reason: `Cell ${cell.id} exceeds terminal bounds [${termWidth}x${termHeight}]: cell [x=${cell.x}, y=${cell.y}, w=${cell.width}, h=${cell.height}]` 
        };
      }
    }

    for (let i = 0; i < cells.length; i++) {
      const c1 = cells[i];
      for (let j = i + 1; j < cells.length; j++) {
        const c2 = cells[j];
        if (c1.width > 2 && c2.width > 2 && c1.height > 2 && c2.height > 2) {
          const overlapX = Math.max(c1.x + 1, c2.x + 1) <= Math.min(c1.x + c1.width - 2, c2.x + c2.width - 2);
          const overlapY = Math.max(c1.y + 1, c2.y + 1) <= Math.min(c1.y + c1.height - 2, c2.y + c2.height - 2);
          if (overlapX && overlapY) {
            return { valid: false, reason: `Cell ${c1.id} interior overlaps with cell ${c2.id}` };
          }
        }
      }
    }

    return { valid: true };
  }
}

export class LayoutEngine {
  static getFallbackLayout(termWidth: number, termHeight: number): LayoutCell[] {
    return [
      { id: "terminal", x: 0, y: 0, width: termWidth, height: termHeight - 3 },
      { id: "input_bar", x: 0, y: termHeight - 3, width: termWidth, height: 3 }
    ];
  }

  static computeLayout(termWidth: number, termHeight: number): LayoutCell[] {
    if (termWidth < 80 || termHeight < 15) {
      return this.getFallbackLayout(termWidth, termHeight);
    }

    const cells: LayoutCell[] = [];
    const visibleWidgets = WidgetRegistry.getWidgets().filter(w => w.visible);

    const leftWidgets = visibleWidgets.filter(w => w.dock === "LEFT");
    const rightWidgets = visibleWidgets.filter(w => w.dock === "RIGHT");

    const contentHeight = termHeight - 3; // reserve 3 rows for input bar

    let leftWidth = 0;
    if (leftWidgets.length > 0) {
      leftWidth = Math.min(30, Math.max(20, Math.floor(termWidth * 0.25)));
    }

    let rightWidth = 0;
    if (rightWidgets.length > 0) {
      rightWidth = Math.min(30, Math.max(20, Math.floor(termWidth * 0.25)));
    }

    // 1. Bottom Input Bar Panel (Span full width)
    cells.push({
      id: "input_bar",
      x: 0,
      y: termHeight - 3,
      width: termWidth,
      height: 3
    });

    // 2. Chat Panel (Center Panel)
    const cX = leftWidth;
    const cW = termWidth - rightWidth - leftWidth;
    cells.push({
      id: "terminal",
      x: cX,
      y: 0,
      width: cW,
      height: contentHeight + 1 // overlap bottom border with input bar
    });

    // 3. Left Sidebar Column (divided vertically)
    if (leftWidth > 0 && leftWidgets.length > 0) {
      const splitY = Math.floor(contentHeight * 0.45);
      leftWidgets.forEach((w, idx) => {
        if (idx === 0) {
          cells.push({
            id: w.id,
            x: 0,
            y: 0,
            width: leftWidth + 1,
            height: splitY + 1
          });
        } else {
          cells.push({
            id: w.id,
            x: 0,
            y: splitY,
            width: leftWidth + 1,
            height: contentHeight - splitY + 1
          });
        }
      });
    }

    // 4. Right Sidebar Column (divided vertically)
    if (rightWidth > 0 && rightWidgets.length > 0) {
      const splitY = Math.floor(contentHeight * 0.3);
      const startX = termWidth - rightWidth;
      rightWidgets.forEach((w, idx) => {
        if (idx === 0) {
          cells.push({
            id: w.id,
            x: startX - 1,
            y: 0,
            width: rightWidth + 1,
            height: splitY + 1
          });
        } else {
          cells.push({
            id: w.id,
            x: startX - 1,
            y: splitY,
            width: rightWidth + 1,
            height: contentHeight - splitY + 1
          });
        }
      });
    }

    return cells;
  }
}
