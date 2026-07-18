import { write_file } from "../../filesystem/index.js";
import { registry } from "../index.js";

registry.register({
  name: "write_file",
  description: "Write content to a file",
  schema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" }
    },
    required: ["path", "content"]
  },
  handler: async (input: any) => {
    const data = input as {
      path: string;
      content: string;
    };

    await write_file(data.path, data.content);

    return {
      success: true
    };
  }
});
