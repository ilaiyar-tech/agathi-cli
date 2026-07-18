import { read_file } from "../../filesystem/index.js";
import { registry } from "../index.js";

registry.register({
  name: "read_file",
  description: "Read a file from the filesystem",
  schema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  },
  handler: async (input: any) => {
    return read_file(String(input.path));
  }
});
