import {
  write_file,
  read_file,
  append_file,
  delete_file,
  path_exists,
  list_directory,
  ensure_directory,
  resolve_path
} from "./filesystem.js";
import assert from "node:assert";
import path from "path";

async function test_filesystem() {
  const testDir = resolve_path(process.cwd(), "test_fs_dir");
  const testFile = resolve_path(testDir, "test.txt");

  await ensure_directory(testDir);
  assert.ok(await path_exists(testDir));

  await write_file(testFile, "hello");
  assert.strictEqual(await read_file(testFile), "hello");

  await append_file(testFile, " world");
  assert.strictEqual(await read_file(testFile), "hello world");

  const files = await list_directory(testDir);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0], "test.txt");

  await delete_file(testDir); // delete_file uses remove, which handles dirs
  assert.strictEqual(await path_exists(testDir), false);

  console.log("filesystem tests passed.");
}

test_filesystem().catch(console.error);
