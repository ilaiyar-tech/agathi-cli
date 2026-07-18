import { connectorFramework, UniversalConnector, ConnectorRequest, ConnectorResponse } from "./connector_framework.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

class MockConnector implements UniversalConnector {
  manifest = {
    id: "mock-rest",
    name: "Mock REST API",
    type: "REST",
    authType: "BearerToken" as const,
    metadata: { endpoint: "https://api.mock.com" }
  };

  async initialize() {}
  async connect() {}
  async healthCheck() { return "healthy" as const; }
  async execute(req: ConnectorRequest): Promise<ConnectorResponse> {
    return {
      success: true,
      status: "Completed" as const,
      data: { body: `Response from ${req.operation}` },
      artifacts: [],
      logs: ["Request executed"],
      metrics: { durationMs: 0 },
      duration: 0
    };
  }
  async disconnect() {}
  async cleanup() {}
  async shutdown() {}
}

async function test_connector_framework() {
  // Clear tables
  memory.database.prepare("delete from connector_registry").run();
  memory.database.prepare("delete from connector_history").run();
  memory.database.prepare("delete from connector_statistics").run();

  const mock = new MockConnector();
  connectorFramework.registerConnector("mock-rest", mock);

  // Validate Register
  const list = connectorFramework.listConnectors();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].manifest.id, "mock-rest");

  // Validate Connect
  await connectorFramework.connect("mock-rest", { token: "secret" });

  // Validate Request Validation
  const req: ConnectorRequest = {
    connectorId: "mock-rest",
    operation: "/v1/users",
    parameters: {},
    timeout: 5000
  };
  assert.ok(connectorFramework.validateRequest("mock-rest", req));

  // Validate Execution
  const response = await connectorFramework.execute("mock-rest", req);
  assert.strictEqual(response.success, true);
  assert.strictEqual(response.data.body, "Response from /v1/users");

  // Validate Health Checks & Stats
  const health = await connectorFramework.healthCheck("mock-rest");
  assert.strictEqual(health, "healthy");

  await connectorFramework.disconnect("mock-rest");

  console.log("connector_framework tests passed.");
}

test_connector_framework().catch(console.error);
