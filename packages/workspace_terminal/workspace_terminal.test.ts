import { WidgetRegistry, LayoutEngine, TerminalRenderer, TuiConsoleManager } from "./index.js";
import assert from "node:assert";

console.log("Running Workspace Terminal TUI tests...");

async function runTests() {
  TuiConsoleManager.registerDefaultWidgets();
  
  const widgets = WidgetRegistry.getWidgets();
  assert.strictEqual(widgets.length, 6);

  // Test layout computations
  const cells = LayoutEngine.computeLayout(100, 30);
  assert.ok(cells.length > 1);
  assert.ok(cells.some(c => c.id === "terminal"));
  assert.ok(cells.some(c => c.id === "models_widget"));

  // Verify layout persistence
  TuiConsoleManager.saveLayout("test_tui_workspace");
  TuiConsoleManager.loadLayout("test_tui_workspace");

  // Verify renderer compiles buffer
  const buffer = TerminalRenderer.drawBuffer(cells, 100, 30, ["Log entry 1", "Log entry 2"]);
  assert.ok(buffer.includes("Log entry 1"));
  assert.ok(buffer.includes("Models"));

  console.log("Workspace Terminal TUI tests passed.");
}

runTests().catch(err => {
  console.error("Workspace Terminal tests failed:", err);
  process.exit(1);
});
