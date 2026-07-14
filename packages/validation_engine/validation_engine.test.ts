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

  const res1 = await validator.verifyAll(testDir);
  assert.strictEqual(res1.runtime.valid, true);
  assert.strictEqual(res1.test.valid, true);

  // Introduce a type error
  await fs.writeFile(path.join(testDir, "index.ts"), "export const x: number = 'string';");
  
  const res2 = await validator.verifyAll(testDir);
  assert.strictEqual(res2.runtime.valid, false);
  assert.ok(res2.runtime.errors.length > 0);

  await fs.remove(testDir);
  console.log("validation_engine tests passed.");
}

test_validation_engine().catch(console.error);
