import assert from "node:assert";
import http from "node:http";
import { dxp } from "./developer_experience.js";

async function test_configuration() {
  const overrides = { port: 9123, host: "127.0.0.1" };
  const loaded = dxp.loadConfig(overrides);
  assert.strictEqual(loaded.port, 9123);
  assert.strictEqual(loaded.host, "127.0.0.1");

  console.log("  test_configuration passed.");
}

async function test_authentication() {
  const token = await dxp.createDeveloperToken("test-dev");
  assert.ok(token.startsWith("il_pat_"));

  const isValid = await dxp.validateToken(token);
  assert.strictEqual(isValid, true);

  await dxp.revokeDeveloperToken(token);
  const isRevoked = await dxp.validateToken(token);
  assert.strictEqual(isRevoked, false);

  console.log("  test_authentication passed.");
}

async function test_diagnostics_and_health() {
  dxp.logDiagnostic("test-type", "System started successfully");
  const diagnostics = await dxp.diagnostics();
  assert.ok(diagnostics.length > 0);
  assert.strictEqual(diagnostics[0].type, "test-type");

  const health = await dxp.health();
  assert.strictEqual(health.status, "healthy");
  assert.strictEqual(health.databaseConnected, true);

  console.log("  test_diagnostics_and_health passed.");
}

async function test_api_gateway() {
  dxp.loadConfig({ port: 9124, host: "127.0.0.1", tokenValidationEnabled: false });
  await dxp.startApiGateway();

  // Test /health
  await new Promise<void>((resolve, reject) => {
    http.get("http://127.0.0.1:9124/health", (res) => {
      assert.strictEqual(res.statusCode, 200);
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const body = JSON.parse(data);
        assert.strictEqual(body.status, "healthy");
        resolve();
      });
    }).on("error", reject);
  });

  // Test OpenAI completions endpoint
  await new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: "hello" }] });
    const req = http.request({
      hostname: "127.0.0.1",
      port: 9124,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    }, (res) => {
      assert.strictEqual(res.statusCode, 200);
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const body = JSON.parse(data);
        assert.strictEqual(body.object, "chat.completion");
        assert.ok(body.choices[0].message.content.includes("Ilaiyar"));
        resolve();
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });

  // Test OpenAI completions streaming endpoint
  await new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: "hello" }], stream: true });
    const req = http.request({
      hostname: "127.0.0.1",
      port: 9124,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    }, (res) => {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers["content-type"], "text/event-stream");
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        assert.ok(data.includes("data: [DONE]"));
        resolve();
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });

  // Test /v1/models endpoint
  await new Promise<void>((resolve, reject) => {
    http.get("http://127.0.0.1:9124/v1/models", (res) => {
      assert.strictEqual(res.statusCode, 200);
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const body = JSON.parse(data);
        assert.strictEqual(body.object, "list");
        assert.strictEqual(body.data[0].id, "ilaiyar-runtime");
        resolve();
      });
    }).on("error", reject);
  });

  // Test /v1/embeddings endpoint
  await new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({ input: "hello", model: "text-embedding-ada-002" });
    const req = http.request({
      hostname: "127.0.0.1",
      port: 9124,
      path: "/v1/embeddings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    }, (res) => {
      assert.strictEqual(res.statusCode, 200);
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const body = JSON.parse(data);
        assert.strictEqual(body.object, "list");
        assert.ok(body.data[0].embedding.length > 0);
        resolve();
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });

  await dxp.stopApiGateway();
  console.log("  test_api_gateway passed.");
}

async function test_onboarding_and_developer_management() {
  const initialAdminCount = await dxp.hasAdmin();
  assert.strictEqual(typeof initialAdminCount, "boolean");

  const adminToken = await dxp.initializeAdmin("Admin User", "admin@ilaiyar.dev", "hashed_password", "Ilaiyar Corp", "Default Workspace");
  assert.ok(adminToken.startsWith("il_pat_"));
  assert.strictEqual(await dxp.hasAdmin(), true);

  // Developer onboarding
  const devToken = await dxp.createDeveloper("Dev User", "dev@ilaiyar.dev");
  assert.ok(devToken.startsWith("il_pat_"));

  const list = await dxp.listDevelopers();
  const dev = list.find(d => d.email === "dev@ilaiyar.dev");
  assert.ok(dev);
  assert.strictEqual(dev.name, "Dev User");
  assert.strictEqual(dev.status, "active");

  // Validate connection
  const connVerified = await dxp.verifyConnection("http://127.0.0.1:9988", devToken);
  assert.strictEqual(connVerified, true);

  // Disable developer
  await dxp.disableDeveloper("dev@ilaiyar.dev");
  const list2 = await dxp.listDevelopers();
  const disabledDev = list2.find(d => d.email === "dev@ilaiyar.dev");
  assert.strictEqual(disabledDev?.status, "disabled");

  // Reset token
  const newToken = await dxp.resetDeveloperToken("dev@ilaiyar.dev");
  assert.ok(newToken !== devToken);

  // Delete developer
  await dxp.deleteDeveloper("dev@ilaiyar.dev");
  const list3 = await dxp.listDevelopers();
  assert.strictEqual(list3.find(d => d.email === "dev@ilaiyar.dev"), undefined);

  console.log("  test_onboarding_and_developer_management passed.");
}

async function runAll() {
  console.log("Running Developer Experience Platform tests...");
  await test_configuration();
  await test_authentication();
  await test_diagnostics_and_health();
  await test_api_gateway();
  await test_onboarding_and_developer_management();
  console.log("developer_experience tests passed.");
}

runAll().catch(console.error);
