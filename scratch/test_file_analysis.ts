import axios from "axios";

async function run() {
  console.log("Starting File Analysis pipeline test...");
  try {
    const res = await axios.post("http://localhost:8100/v1/chat/completions", {
      model: "chat",
      messages: [
        { role: "user", content: "check the files for chat bot used in ilaiyar admin console..." }
      ],
      stream: false
    });

    console.log("Success! Status code:", res.status);
    console.log("Response content:", res.data.choices?.[0]?.message?.content);
  } catch (e: any) {
    console.error("Test failed:", e.response?.status, e.response?.data || e.message);
  }
}

run();
