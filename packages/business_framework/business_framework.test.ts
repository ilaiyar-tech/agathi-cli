import { BusinessModuleManager, BusinessAuthSystem, BusinessCLIRegistry, BusinessUIRegistry, BusinessModule } from "./business_framework.js";
import assert from "node:assert";

process.env.ADMIN_USERNAME = "ilaiyar";
process.env.ADMIN_PASSWORD = "Ilaiyar@2026";

console.log("Running Business Module Framework tests...");

const manager = new BusinessModuleManager();

const testModule: BusinessModule = {
  manifest: {
    name: "test_business_module",
    version: "1.0.0",
    description: "Testing business framework integration",
    dependencies: [],
    permissions: ["read", "write"]
  },
  async initialize() {},
  async activate() {},
  async deactivate() {}
};

async function runTests() {
  // Test installation and lifecycle
  await manager.install(testModule);
  await manager.initialize("test_business_module");
  await manager.activate("test_business_module");
  
  assert.strictEqual(manager.isActive("test_business_module"), true);
  
  const list = manager.listModules();
  const installedMod = list.find(m => m.name === "test_business_module");
  assert.ok(installedMod);
  assert.strictEqual(installedMod.status, "active");

  await manager.deactivate("test_business_module");
  assert.strictEqual(manager.isActive("test_business_module"), false);

  // Test Authentication (ilaiyar and Ilaiyar@2026)
  assert.strictEqual(BusinessAuthSystem.authenticate("ilaiyar", "Ilaiyar@2026"), true);
  assert.strictEqual(BusinessAuthSystem.authenticate("wrong_user", "Ilaiyar@2026"), false);
  assert.strictEqual(BusinessAuthSystem.authenticate("ilaiyar", "wrong_pass"), false);

  // Test CLI Registry
  let called = false;
  BusinessCLIRegistry.registerCommand("test_cmd", async (args) => {
    called = true;
    assert.strictEqual(args.val, 42);
  });
  await BusinessCLIRegistry.executeCommand("test_cmd", { val: 42 });
  assert.strictEqual(called, true);

  // Test UI Registry
  BusinessUIRegistry.registerWidget("test_widget", { type: "chart", data: [] });
  const widgets = BusinessUIRegistry.getWidgets();
  assert.strictEqual(widgets.length, 1);
  assert.strictEqual(widgets[0].type, "chart");

  console.log("Business Module Framework tests passed.");
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
