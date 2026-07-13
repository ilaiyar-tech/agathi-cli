import { validator } from "./validation_engine.js";
import assert from "node:assert";
import path from "path";
import fs from "fs-extra";

async function test_validation_engine() {
  const testDir = path.join(process.cwd(), "test_valid_dir");
  await fs.ensureDir(testDir);
  
  await fs.writeJson(path.join(testDir, "package.json"), {
    name: "test-valid",
    scripts: {
      test: "echo 'test passed'"
    }
  });

  await fs.writeFile(path.join(testDir, "index.ts"), "export const x: number = 1;");
  await fs.writeJson(path.join(testDir, "tsconfig.json"), {
    compilerOptions: {
      strict: true,
      target: "ESNext"
    }
  });

  const typeRes = await validator.validateTypes(testDir);
  assert.strictEqual(typeRes.valid, true);

  const testRes = await validator.validateTests(testDir);
  assert.strictEqual(testRes.valid, true);

  // Introduce a type error
  await fs.writeFile(path.join(testDir, "index.ts"), "export const x: number = 'string';");
  
  const typeFailRes = await validator.validateTypes(testDir);
  assert.strictEqual(typeFailRes.valid, false);
  assert.ok(typeFailRes.errors.length > 0);

  await fs.remove(testDir);
  console.log("validation_engine tests passed.");
}

test_validation_engine().catch(console.error);
