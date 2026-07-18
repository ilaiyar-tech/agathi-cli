import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { models as getModels, getReleases } from "../services/api";

export function landing_page() {
  const [modelList, setModelList] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("linux");

  useEffect(() => {
    getModels()
      .then((res: any) => setModelList(res.data || []))
      .catch(console.error);

    getReleases()
      .then((res: any) => setReleases(res.data.releases || []))
      .catch(console.error);
  }, []);

  const filteredModels = modelList.filter((m: any) =>
    (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.provider || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#05070c] relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-900/10 px-4 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-md mb-8">
          🚀 Stable Release v1.0.0 is Live
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-purple-400 mb-6 leading-tight">
          Switchable Brain.<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Without Losing Memory.</span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-gray-400 font-medium mb-10 leading-relaxed">
          Use any AI model. Switch providers instantly. Keep your conversations, memories, tools, and workflows in one place.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <a
            href="#downloads"
            className="rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-8 py-3.5 text-sm font-semibold shadow-lg shadow-purple-500/20 hover:opacity-95 transition-opacity"
          >
            Download v1.0.0
          </a>
          <Link
            to="/docs"
            className="rounded-full bg-white/5 border border-white/10 px-8 py-3.5 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            View Docs
          </Link>
        </div>

        {/* CLI Terminal Mockup */}
        <div className="w-full max-w-3xl rounded-xl border border-white/5 bg-black/40 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-purple-500/5 text-left font-mono text-sm leading-relaxed text-gray-300">
          <div className="border-b border-white/5 bg-white/5 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="text-xs text-gray-500 ml-4">agathi@tu2pu-cli:~</span>
          </div>
          <div className="p-6 space-y-3">
            <div><span className="text-purple-400">$</span> npm install -g tu2pu</div>
            <div className="text-gray-500">✓ Installed tu2pu CLI v1.0.0</div>
            <div><span className="text-purple-400">$</span> tu2pu doctor</div>
            <div className="text-emerald-400">  ✔ CLI runtime OK</div>
            <div className="text-emerald-400">  ✔ agent_runtime loaded</div>
            <div className="text-emerald-400">  ✔ database connection established</div>
            <div><span className="text-purple-400">$</span> tu2pu interactive</div>
            <div className="text-purple-400 font-semibold">
              tu2pu Operating Layer | Switchable Brain Active
            </div>
            <div className="text-gray-400">/session chat_session_01</div>
            <div><span className="text-purple-400">&gt;</span> Prompt: Refactor the auth service.</div>
          </div>
        </div>
      </section>

      {/* Switchable Brain Section */}
      <section className="w-full max-w-7xl px-6 py-20 border-t border-white/5">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6">
              One Brain. Any Model.
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8">
              Changing model providers usually means losing conversation histories, contextual workspace files, and custom tooling setups. tu2pu decouples your memory and local tools into a persistent local agent layer, enabling you to switch between local/cloud AI backends instantly.
            </p>
            <div className="space-y-4">
              {[
                "Persistent SQLite message logs & file indexes",
                "Model-agnostic task-scheduler workflow automation",
                "Built-in workspace builder & RAG engine context prioritizer"
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold">✓</div>
                  <span className="text-sm font-medium text-gray-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent p-8 flex flex-col gap-6">
            <h3 className="text-sm font-bold tracking-widest text-purple-400 uppercase">Interactive Switchable Brain</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Google Gemini", active: true },
                { name: "OpenAI GPT-4", active: false },
                { name: "Anthropic Claude", active: false },
                { name: "Local Ollama Llama3", active: false }
              ].map((p, idx) => (
                <button
                  key={idx}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    p.active
                      ? "border-purple-500/30 bg-purple-900/20 text-white shadow-lg shadow-purple-500/5"
                      : "border-white/5 bg-white/5 text-gray-400 hover:border-white/10"
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">Provider</div>
                  <div className="font-semibold text-sm">{p.name}</div>
                </button>
              ))}
            </div>
            <div className="border-t border-white/5 pt-6 text-center text-xs text-gray-500">
              The underlying database, tool routing, and contexts remain 100% active.
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-7xl px-6 py-20 border-t border-white/5">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-12 text-center">Architected for Production</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Switchable Brain", desc: "Change LLM model adaptors instantly without resetting session histories or token parameters." },
            { title: "Local First & Secure", desc: "All state records, file scans, and session DB databases reside locally on your host environment." },
            { title: "Context OS Engine", desc: "Smart contextual assembler with priority rank budgeting to compress prompts automatically." },
            { title: "OpenAI Compatible", desc: "Exposes standardized endpoint routing enabling seamless integration with any standard IDE." },
            { title: "Workflow Automation", desc: "Autonomous task pipeline scheduler with retry checks and self-correction trust mechanisms." },
            { title: "Enterprise Controls", desc: "Generate, rotate, and revoke local API keys with telemetry logging tools built in." }
          ].map((feat, idx) => (
            <div key={idx} className="p-6 rounded-xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-white/10 transition-colors">
              <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Models Directory */}
      <section className="w-full max-w-7xl px-6 py-20 border-t border-white/5">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-4 text-center">Supported Model Registry</h2>
        <p className="text-gray-400 text-center mb-10 max-w-md mx-auto">
          Queried directly from your local registry catalog.
        </p>

        <div className="mb-6 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search models or providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-xs font-semibold text-gray-400 uppercase">
                <th className="p-4">Model Name</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Context Limit</th>
                <th className="p-4">Capabilities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
              {filteredModels.length > 0 ? (
                filteredModels.map((m: any, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="p-4 font-semibold text-white">{m.name || "Default Model"}</td>
                    <td className="p-4 text-gray-400">{m.provider || "Local"}</td>
                    <td className="p-4">{m.context_size || "128k"}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {m.capabilities?.vision && <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Vision</span>}
                        {m.capabilities?.reasoning && <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">Reasoning</span>}
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Coding</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No models matching search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="w-full max-w-7xl px-6 py-20 border-t border-white/5">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-4 text-center">Download Releases</h2>
        <p className="text-gray-400 text-center mb-12 max-w-md mx-auto">
          Get the stable release binary distribution package.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {releases.map((rel: any, idx) => (
            <div key={idx} className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">Platform</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v{rel.version}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{rel.platform}</h3>
                <p className="text-xs text-gray-500 mb-6 font-mono break-all bg-black/30 p-3 rounded-lg border border-white/5">
                  SHA256: {rel.checksum}
                </p>
                <p className="text-sm text-gray-400 mb-6">{rel.notes}</p>
              </div>

              <a
                href={`#`}
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Starting download simulation for ${rel.filename}`);
                }}
                className="w-full rounded-xl bg-white text-black py-3 text-center text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Download Package
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Installation Tab Snippets */}
      <section className="w-full max-w-3xl px-6 py-20 border-t border-white/5 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-10">Quick Installation</h2>
        <div className="border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex border-b border-white/5 bg-white/5 text-sm text-gray-400">
            {["linux", "windows", "source"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold capitalize border-b-2 transition-all ${
                  activeTab === tab
                    ? "border-purple-500 text-white bg-purple-950/10"
                    : "border-transparent hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-8 text-left font-mono text-sm bg-black/20 text-gray-300">
            {activeTab === "linux" && (
              <div className="space-y-2">
                <div># Fetch installer and install globally</div>
                <div className="text-purple-400">npm install -g tu2pu</div>
                <div>tu2pu doctor</div>
              </div>
            )}
            {activeTab === "windows" && (
              <div className="space-y-2">
                <div># Open PowerShell and run</div>
                <div className="text-purple-400">npm install --global tu2pu</div>
                <div>tu2pu.cmd doctor</div>
              </div>
            )}
            {activeTab === "source" && (
              <div className="space-y-2">
                <div># Clone repository, build, and link</div>
                <div>git clone https://github.com/ilaiyar/thudupu-ai.git</div>
                <div>cd thudupu-ai</div>
                <div>npm install</div>
                <div>npm run build</div>
                <div className="text-purple-400">npm link</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Switchable Brain Creator Shoutout */}
      <section className="w-full bg-gradient-to-r from-purple-950/20 via-cyan-950/10 to-transparent py-16 border-t border-white/5 text-center px-6">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-3">LLM Orchestration Revolution</h2>
        <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed mb-6">
          This unified state and context management orchestration layer was built by **Ilaiyar Solutions** to redefine the future of large language model agent execution.
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
          POWERED BY <span className="text-purple-400">ILAIYAR SOLUTIONS</span>
        </div>
      </section>
    </div>
  );
}
