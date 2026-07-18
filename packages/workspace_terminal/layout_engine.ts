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
    return [{ id: "terminal", x: 0, y: 0, width: termWidth, height: termHeight }];
  }

  static computeLayout(termWidth: number, termHeight: number): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const visibleWidgets = WidgetRegistry.getWidgets().filter(w => w.visible);

    if (termWidth < 80 || termHeight < 15) {
      return this.getFallbackLayout(termWidth, termHeight);
    }

    const leftWidgets = visibleWidgets.filter(w => w.dock === "LEFT");
    const rightWidgets = visibleWidgets.filter(w => w.dock === "RIGHT");
    const bottomWidgets = visibleWidgets.filter(w => w.dock === "BOTTOM");
    const topWidgets = visibleWidgets.filter(w => w.dock === "TOP");

    let headerHeight = 0;
    if (topWidgets.length > 0) {
      headerHeight = 3; // Fixed header row height
    }

    let leftWidth = 0;
    if (leftWidgets.length > 0) {
      leftWidth = Math.min(30, Math.max(20, Math.floor(termWidth * 0.25)));
    }

    let rightWidth = 0;
    if (rightWidgets.length > 0 && termWidth > 120) {
      rightWidth = Math.min(30, Math.max(20, Math.floor(termWidth * 0.25)));
    }

    let footerHeight = 0;
    if (bottomWidgets.length > 0) {
      footerHeight = Math.min(10, Math.max(5, Math.floor(termHeight * 0.25)));
    }

    const middleHeight = termHeight - headerHeight - footerHeight;

    // 1. Top Header Cells (Span full width)
    if (headerHeight > 0) {
      topWidgets.forEach(w => {
        cells.push({
          id: w.id,
          x: 0,
          y: 0,
          width: termWidth,
          height: headerHeight + 1
        });
      });
    }

    const middleY = headerHeight;
    const footerY = termHeight - footerHeight;

    // 2. Center Chat Terminal
    const cX = leftWidth;
    const cW = termWidth - rightWidth - leftWidth;
    
    cells.push({
      id: "terminal",
      x: cX,
      y: middleY,
      width: cW,
      height: middleHeight + (footerHeight > 0 ? 1 : 0)
    });

    // 3. Bottom Footer Cells
    if (footerHeight > 0 && bottomWidgets.length > 0) {
      const cellWidth = Math.floor(cW / bottomWidgets.length);
      bottomWidgets.forEach((w, idx) => {
        const x = cX + idx * cellWidth;
        const width = idx === bottomWidgets.length - 1 
          ? cW - (idx * cellWidth) 
          : cellWidth + 1;
        cells.push({
          id: w.id,
          x,
          y: footerY,
          width,
          height: footerHeight
        });
      });
    }

    // 4. Left Sidebar Widgets
    if (leftWidth > 0 && leftWidgets.length > 0) {
      const cellHeight = Math.floor(middleHeight / leftWidgets.length);
      leftWidgets.forEach((w, idx) => {
        const y = middleY + idx * cellHeight;
        const height = idx === leftWidgets.length - 1 
          ? middleHeight - (idx * cellHeight) 
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

    // 5. Right Sidebar Widgets
    if (rightWidth > 0 && rightWidgets.length > 0) {
      const cellHeight = Math.floor(middleHeight / rightWidgets.length);
      const startX = termWidth - rightWidth;
      rightWidgets.forEach((w, idx) => {
        const y = middleY + idx * cellHeight;
        const height = idx === rightWidgets.length - 1 
          ? middleHeight - (idx * cellHeight) 
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
