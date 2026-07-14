import { execa } from "execa";
import { registry } from "../index.js";

registry.register({
  name: "run_command",
  description: "Run a bash command",
  schema: {
    type: "object",
    properties: {
      command: { type: "string" },
      timeout: { type: "number", description: "Optional timeout in milliseconds to wait for the command to finish. Defaults to 4000." }
    },
    required: ["command"]
  },
  handler: async (input: any) => {
    const command = String(input.command);
    const timeout = typeof input.timeout === "number" ? input.timeout : 4000;

    const proc = execa({
      shell: true,
      detached: true,
      cleanup: false
    })`${command}`;

    // Prevent unhandled promise rejection crashes
    proc.catch(() => {});

    let stdoutData = "";
    let stderrData = "";
    proc.stdout?.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    let finished = false;
    let timer: any;
    const timeoutPromise = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeout);
    });

    await Promise.race([
      proc.then(() => { finished = true; }),
      timeoutPromise
    ]);

    clearTimeout(timer);

    if (finished) {
      const res = await proc;
      return {
        stdout: res.stdout,
        stderr: res.stderr
      };
    } else {
      // Unref the child process so it doesn't block the CLI from exiting
      proc.unref();
      return {
        stdout: stdoutData + "\n... [Command is still running in the background]",
        stderr: stderrData
      };
    }
  }
});
