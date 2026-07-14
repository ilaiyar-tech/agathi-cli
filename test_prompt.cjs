const axios = require('axios');
async function run() {
  const payload = {
    messages: [
      { role: "system", content: "You are an AI." },
      { role: "user", content: "Test prompt. Respond with 'hello'." }
    ],
    temperature: 0,
    stream: true
  };
  const res = await axios.post("http://127.0.0.1:8012/v1/chat/completions", payload, { responseType: "stream" });
  res.data.on("data", d => console.log(d.toString()));
}
run();
