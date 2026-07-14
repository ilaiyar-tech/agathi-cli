const axios = require('axios');
async function run() {
  const payload = {
    messages: [
      { role: "system", content: "You are an AI." },
      { role: "user", content: "What is the weather in Paris?" }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string" }
            },
            required: ["location"]
          }
        }
      }
    ],
    temperature: 0,
    stream: true
  };
  const res = await axios.post("http://127.0.0.1:8012/v1/chat/completions", payload, { responseType: "stream" });
  res.data.on("data", d => console.log(d.toString()));
}
run();
