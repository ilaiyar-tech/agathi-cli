import { execa } from "execa";

async function run() {
  console.log("Starting...");
  const command = "npm run start";

  const proc = execa({
    shell: true,
    detached: true,
    cleanup: false
  })`${command}`;

  let stdoutData = "";
  let stderrData = "";
  proc.stdout?.on("data", (chunk) => {
    stdoutData += chunk.toString();
    console.log("stdout:", chunk.toString());
  });

  let finished = false;
  let timer: any;
  const timeoutPromise = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, 4000);
  });

  await Promise.race([
    proc.then(() => { finished = true; }),
    timeoutPromise
  ]);

  clearTimeout(timer);
  console.log("Finished race. finished =", finished);

  if (finished) {
    const res = await proc;
    console.log("Done!", res.stdout);
  } else {
    proc.unref();
    console.log("Timed out! Background data:", stdoutData);
  }
}

run().catch(console.error);
