import { useState } from "react";
import { api } from "../services/api";

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.tu2pu.in/v1/chat/completions \\
  -H "Authorization: Bearer sk_tu2pu_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "reasoner",
    "messages": [{"role": "user", "content": "Explain switchable brain."}]
  }'`,
  node: `import { OpenAI } from "openai";

const tu2pu = new OpenAI({
  apiKey: "sk_tu2pu_YOUR_KEY",
  baseURL: "https://api.tu2pu.in/v1"
});

const completion = await tu2pu.chat.completions.create({
  model: "coder",
  messages: [{ role: "user", content: "Optimize this regex function" }]
});

console.log(completion.choices[0].message.content);`,
  python: `from openai import OpenAI

tu2pu = OpenAI(
    api_key="sk_tu2pu_YOUR_KEY",
    base_url="https://api.tu2pu.in/v1"
)

completion = tu2pu.chat.completions.create(
    model="reasoner",
    messages=[{"role": "user", "content": "Verify plan 04"}]
)

print(completion.choices[0].message.content)`,
  go: `package main

import (
	"context"
	"fmt"
	"github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("sk_tu2pu_YOUR_KEY")
	config.BaseURL = "https://api.tu2pu.in/v1"

	client := openai.NewClientWithConfig(config)
	resp, _ := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "planner",
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleUser, Content: "Validate build paths"},
			},
		},
	)

	fmt.Println(resp.Choices[0].Message.Content)
}`,
  rust: `use openai_api_rs::v1::api::Client;
use openai_api_rs::v1::chat_completion::{ChatCompletionRequest, Message, Role};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new_with_url(
        "https://api.tu2pu.in/v1".to_string(),
        "sk_tu2pu_YOUR_KEY".to_string()
    );

    let req = ChatCompletionRequest::new(
        "coder".to_string(),
        vec![Message {
            role: Role::User,
            content: "Convert loop to map in Rust".to_string(),
            name: None,
        }],
    );

    let result = client.chat_completion(req).await?;
    println!("{:?}", result.choices[0].message.content);
    Ok(())
}`
};

export function api_platform_page() {
  const [activeLang, setActiveLang] = useState<keyof typeof CODE_EXAMPLES>("curl");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("/v1/models");
  const [method, setMethod] = useState("GET");
  const [reqBody, setReqBody] = useState(`{\n  "model": "reasoner",\n  "messages": [\n    {\n      "role": "user",\n      "content": "Hello, tu2pu!"\n    }\n  ]\n}`);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTestRequest = async () => {
    setLoading(true);
    setResponse("");
    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      let res;
      if (method === "GET") {
        res = await api.get(endpoint, { headers });
      } else {
        res = await api.post(endpoint, JSON.parse(reqBody), { headers });
      }

      setResponse(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setResponse(
        err.response
          ? `HTTP ${err.response.status}\n${JSON.stringify(err.response.data, null, 2)}`
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 flex flex-col lg:flex-row gap-12 min-h-[calc(100vh-10rem)]">
      {/* API Reference Details */}
      <div className="flex-1 space-y-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
            Developer Platform API
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Integrate the Switchable Brain orchestration layer directly into your CLI scripts, custom websites, or IDE modules using the standard OpenAI-compatible API spec.
          </p>
        </div>

        {/* Auth Docs */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-white/5 pb-2">
            Authentication
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            All API requests must contain a secure Bearer token key in the HTTP header authorization. Generate developer API keys under the user dashboard key panel.
          </p>
          <pre className="bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-xs text-purple-300">
            Authorization: Bearer sk_tu2pu_YOUR_SECRET_KEY
          </pre>
        </div>

        {/* Code Snippets */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-white/5 pb-2">
            Code Examples
          </h2>
          <div className="border border-white/5 bg-black/20 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex border-b border-white/5 bg-white/5 text-xs text-gray-400">
              {Object.keys(CODE_EXAMPLES).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang as any)}
                  className={`px-5 py-3 font-semibold uppercase border-b-2 transition-all ${
                    activeLang === lang
                      ? "border-purple-500 text-white bg-purple-950/10"
                      : "border-transparent hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <pre className="p-6 font-mono text-xs text-purple-300 overflow-x-auto leading-relaxed max-h-[300px]">
              {CODE_EXAMPLES[activeLang]}
            </pre>
          </div>
        </div>
      </div>

      {/* Interactive Explorer Panel */}
      <div className="w-full lg:w-[480px] shrink-0 border border-white/5 rounded-2xl bg-black/20 p-8 shadow-xl flex flex-col justify-between self-start">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Interactive API Explorer</h3>
            <p className="text-xs text-gray-500">Query real endpoints on your local or cloud tunnel.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bearer API Key</label>
              <input
                type="text"
                placeholder="sk_tu2pu_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-24">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Method</label>
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    if (e.target.value === "GET") {
                      setEndpoint("/v1/models");
                    } else {
                      setEndpoint("/v1/chat/completions");
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Endpoint Route</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                />
              </div>
            </div>

            {method === "POST" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Request Body (JSON)</label>
                <textarea
                  value={reqBody}
                  onChange={(e) => setReqBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-purple-300 focus:outline-none focus:border-purple-500/50 font-mono"
                />
              </div>
            )}

            <button
              onClick={handleTestRequest}
              disabled={loading}
              className="w-full rounded-xl bg-white text-black py-2.5 text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>

        {response && (
          <div className="mt-6 space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Response Payload</span>
            <pre className="bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-xs text-purple-300 overflow-x-auto max-h-[220px]">
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
