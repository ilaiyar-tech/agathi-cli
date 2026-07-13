import { gateway } from "./api_gateway.js";
import assert from "node:assert";
import http from "http";

async function test_api_gateway() {
  const server = gateway.listen(8999);

  const req = http.get("http://localhost:8999/health", (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      assert.strictEqual(res.statusCode, 200);
      assert.ok(data.includes("ok"));
      server.close();
      console.log("api_gateway tests passed.");
    });
  });

  req.on("error", (e) => {
    server.close();
    console.error(e);
    process.exit(1);
  });
}

test_api_gateway();
