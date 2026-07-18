import { WidgetRegistry, LayoutEngine, LayoutValidator, TerminalRenderer, TuiConsoleManager } from "./index.js";
import assert from "node:assert";

console.log("Running Workspace Terminal TUI tests...");

async function runTests() {
  TuiConsoleManager.registerDefaultWidgets();
  
  const widgets = WidgetRegistry.getWidgets();
  assert.strictEqual(widgets.length, 7);

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

  // --- STRESS TESTING WIDGET LAYOUTS ACROSS SPECIFIED TERMINAL SIZES ---
  const testSizes = [
    { w: 80, h: 24 },
    { w: 100, h: 30 },
    { w: 120, h: 40 },
    { w: 160, h: 50 },
    { w: 200, h: 60 },
    { w: 300, h: 80 }
  ];

  console.log("Stress testing TUI layouts across target sizes...");
  for (const { w, h } of testSizes) {
    const layout = LayoutEngine.computeLayout(w, h);
    const validation = LayoutValidator.validate(layout, w, h);
    
    if (!validation.valid) {
      throw new Error(`Stress test failed at terminal size ${w}x${h}: ${validation.reason}`);
    }
    
    // Draw buffer to verify it renders without crashing
    const rendering = TerminalRenderer.drawBuffer(layout, w, h, [
      `Initializing system for ${w}x${h}`,
      "Checking bounds and layouts",
      "Rendering verification OK"
    ]);
    
    assert.ok(rendering.length > 0);
    console.log(`✔ Layout validation passed for terminal size ${w}x${h}`);
  }

  console.log("Workspace Terminal TUI tests passed.");
}

runTests().catch(err => {
  console.error("Workspace Terminal tests failed:", err);
  process.exit(1);
});
