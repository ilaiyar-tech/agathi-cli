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
      cleanup: true
    })`${command}`;

    // Prevent unhandled promise rejection crashes
    proc.catch(() => {});

    let stdoutData = "";
    let stderrData = "";
    proc.stdout?.on("on" in (proc.stdout || {}) ? "data" : "data", (chunk) => {
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

    try {
      await Promise.race([
        proc.then(
          () => { finished = true; },
          () => { finished = true; }
        ),
        timeoutPromise
      ]);
    } finally {
      clearTimeout(timer);
    }

    if (finished) {
      try {
        const res = await proc;
        return {
          stdout: res.stdout,
          stderr: res.stderr
        };
      } catch (err: any) {
        return {
          stdout: err.stdout || stdoutData,
          stderr: err.stderr || err.message || String(err)
        };
      }
    } else {
      // Cleanly kill the child process group to avoid resource leaks
      try {
        if (proc.pid) {
          process.kill(-proc.pid, "SIGKILL");
        } else {
          proc.kill("SIGKILL");
        }
      } catch (err) {}
      return {
        stdout: stdoutData + "\n... [Command timed out and was killed]",
        stderr: stderrData + "\n[Command timed out]"
      };
    }
  }
});
