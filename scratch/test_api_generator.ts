import axios from "axios";

async function run() {
  console.log("Starting generator test...");
  try {
    const res = await axios.post("http://localhost:8100/generator/start", {
      prompt: "Todo App",
      framework: "React",
      template: "Default Spa"
    });

    const data = res.data;
    console.log("Start response:", data);

    let done = false;
    while (!done) {
      await new Promise(r => setTimeout(r, 3000));
      const pollRes = await axios.get(`http://localhost:8100/generator/${data.id}`);
      const pollData = pollRes.data;
      console.log(`Progress: ${pollData.progress}% | Status: ${pollData.status}`);
      if (pollData.logs) {
        console.log("Latest Log:", pollData.logs[pollData.logs.length - 1]);
      }
      if (pollData.status === "completed" || pollData.status === "failed") {
        done = true;
        console.log("Finished! Final status:", pollData.status);
        console.log("Files generated:", pollData.files?.map((f: any) => f.path));
      }
    }
  } catch (e: any) {
    console.error("Test failed:", e.message);
  }
}

run();
