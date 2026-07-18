import { WorkspaceWidget, WidgetRegistry } from "./widget_registry.js";

export interface LayoutCell {
  id: string; // widget ID or 'terminal'
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
      // 1. Reject negative or zero sizes
      if (cell.width <= 0 || cell.height <= 0) {
        return { valid: false, reason: `Cell ${cell.id} has negative or zero size: ${cell.width}x${cell.height}` };
      }

      // 2. Reject out-of-bound rectangles
      if (cell.x < 0 || cell.y < 0 || cell.x + cell.width > termWidth || cell.y + cell.height > termHeight) {
        return { 
          valid: false, 
          reason: `Cell ${cell.id} exceeds terminal bounds [${termWidth}x${termHeight}]: cell [x=${cell.x}, y=${cell.y}, w=${cell.width}, h=${cell.height}]` 
        };
      }
    }

    // 3. Reject interior overlapping rectangles
    for (let i = 0; i < cells.length; i++) {
      const c1 = cells[i];
      for (let j = i + 1; j < cells.length; j++) {
        const c2 = cells[j];
        
        // Two cells overlap if their interiors intersect.
        // Interior of cell is: [x + 1, x + width - 2] x [y + 1, y + height - 2].
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
    return [{ id: "terminal", x: 0, y: 0, width: termWidth, height: termHeight }];
  }

  static computeLayout(termWidth: number, termHeight: number): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const visibleWidgets = WidgetRegistry.getWidgets().filter(w => w.visible);

    // If screen space is too constrained, allocate 100% to main terminal
    if (termWidth < 80 || termHeight < 15) {
      return this.getFallbackLayout(termWidth, termHeight);
    }

    const leftWidgets = visibleWidgets.filter(w => w.dock === "LEFT");
    const rightWidgets = visibleWidgets.filter(w => w.dock === "RIGHT");
    const bottomWidgets = visibleWidgets.filter(w => w.dock === "BOTTOM");

    let leftWidth = 0;
    if (leftWidgets.length > 0) {
      leftWidth = Math.min(30, Math.floor(termWidth * 0.25));
    }

    let rightWidth = 0;
    if (rightWidgets.length > 0 && termWidth > 120) {
      rightWidth = Math.min(30, Math.floor(termWidth * 0.25));
    }

    let bottomHeight = 0;
    if (bottomWidgets.length > 0) {
      bottomHeight = Math.min(10, Math.floor(termHeight * 0.30));
    }

    const terminalHeight = termHeight - bottomHeight;

    // Center Column X span: from leftWidth to termWidth - rightWidth
    const cX = leftWidth;
    const cW = termWidth - rightWidth - leftWidth;
    const cH = terminalHeight + (bottomHeight > 0 ? 1 : 0);

    cells.push({
      id: "terminal",
      x: cX,
      y: 0,
      width: cW,
      height: cH
    });

    if (bottomHeight > 0 && bottomWidgets.length > 0) {
      const totalWidthForBottom = cW;
      const cellWidth = Math.floor(totalWidthForBottom / bottomWidgets.length);
      bottomWidgets.forEach((w, idx) => {
        const x = cX + idx * cellWidth;
        const width = idx === bottomWidgets.length - 1 
          ? totalWidthForBottom - (idx * cellWidth) 
          : cellWidth + 1;
        cells.push({
          id: w.id,
          x,
          y: terminalHeight,
          width,
          height: termHeight - terminalHeight
        });
      });
    }

    if (leftWidth > 0 && leftWidgets.length > 0) {
      const cellHeight = Math.floor(termHeight / leftWidgets.length);
      leftWidgets.forEach((w, idx) => {
        const y = idx * cellHeight;
        const height = idx === leftWidgets.length - 1 
          ? termHeight - y 
          : cellHeight + 1;
        cells.push({
          id: w.id,
          x: 0,
          y,
          width: leftWidth + 1,
          height
        });
      });
    }

    if (rightWidth > 0 && rightWidgets.length > 0) {
      const cellHeight = Math.floor(termHeight / rightWidgets.length);
      const startX = termWidth - rightWidth;
      rightWidgets.forEach((w, idx) => {
        const y = idx * cellHeight;
        const height = idx === rightWidgets.length - 1 
          ? termHeight - y 
          : cellHeight + 1;
        cells.push({
          id: w.id,
          x: startX - 1,
          y,
          width: rightWidth + 1,
          height
        });
      });
    }

    return cells;
  }
}
