import { WorkspaceWidget, WidgetRegistry } from "./widget_registry.js";

export interface LayoutCell {
  id: string; // widget ID or 'terminal'
  x: number;
  y: number;
  width: number;
  height: number;
}

export class LayoutEngine {
  static computeLayout(termWidth: number, termHeight: number): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const visibleWidgets = WidgetRegistry.getWidgets().filter(w => w.visible);

    // If screen space is too constrained, allocate 100% to main terminal
    if (termWidth < 80 || termHeight < 15) {
      cells.push({ id: "terminal", x: 0, y: 0, width: termWidth, height: termHeight });
      return cells;
    }

    // Identify docks
    const leftWidgets = visibleWidgets.filter(w => w.dock === "LEFT");
    const rightWidgets = visibleWidgets.filter(w => w.dock === "RIGHT");
    const bottomWidgets = visibleWidgets.filter(w => w.dock === "BOTTOM");

    let leftWidth = 0;
    let rightWidth = 0;

    if (leftWidgets.length > 0) {
      leftWidth = Math.min(30, Math.floor(termWidth * 0.25));
    }
    if (rightWidgets.length > 0 && termWidth > 120) {
      rightWidth = Math.min(30, Math.floor(termWidth * 0.25));
    }

    const centerWidth = termWidth - leftWidth - rightWidth;
    const centerX = leftWidth;

    // Stack bottom widgets
    let bottomHeight = 0;
    if (bottomWidgets.length > 0) {
      bottomHeight = Math.min(10, Math.floor(termHeight * 0.30));
    }

    const terminalHeight = termHeight - bottomHeight;

    // Add main center terminal cell
    cells.push({
      id: "terminal",
      x: centerX,
      y: 0,
      width: centerWidth,
      height: terminalHeight
    });

    // Add bottom dock widgets cell stacked horizontally or vertically
    if (bottomHeight > 0 && bottomWidgets.length > 0) {
      const cellWidth = Math.floor(centerWidth / bottomWidgets.length);
      bottomWidgets.forEach((w, idx) => {
        cells.push({
          id: w.id,
          x: centerX + (idx * cellWidth),
          y: terminalHeight,
          width: idx === bottomWidgets.length - 1 ? centerWidth - (idx * cellWidth) : cellWidth,
          height: bottomHeight
        });
      });
    }

    // Stack left column widgets
    if (leftWidth > 0 && leftWidgets.length > 0) {
      const cellHeight = Math.floor(termHeight / leftWidgets.length);
      leftWidgets.forEach((w, idx) => {
        cells.push({
          id: w.id,
          x: 0,
          y: idx * cellHeight,
          width: leftWidth,
          height: idx === leftWidgets.length - 1 ? termHeight - (idx * cellHeight) : cellHeight
        });
      });
    }

    // Stack right column widgets
    if (rightWidth > 0 && rightWidgets.length > 0) {
      const cellHeight = Math.floor(termHeight / rightWidgets.length);
      rightWidgets.forEach((w, idx) => {
        cells.push({
          id: w.id,
          x: termWidth - rightWidth,
          y: idx * cellHeight,
          width: rightWidth,
          height: idx === rightWidgets.length - 1 ? termHeight - (idx * cellHeight) : cellHeight
        });
      });
    }

    return cells;
  }
}
