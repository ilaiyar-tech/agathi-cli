import { registry } from "./tool_registry.js";

registry.register({
  name: "finish",
  description: "Signal that the task is completed and transition to Summary.",
  schema: {
    type: "object",
    properties: {}
  },
  handler: () => {
    return "Task completed.";
  }
});
