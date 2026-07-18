import { templates } from "./template_engine.js";
import assert from "node:assert";

function test_template_engine() {
  const result = templates.render("Hello {{ name }}, age {{ metadata.age }}!", {
    name: "World",
    metadata: { age: 42 }
  });

  assert.strictEqual(result, "Hello World, age 42!");

  const compiled = templates.compile("Value: {{ val }}");
  assert.strictEqual(compiled({ val: "test" }), "Value: test");

  console.log("template_engine tests passed.");
}

test_template_engine();
