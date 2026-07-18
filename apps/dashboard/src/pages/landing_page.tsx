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
    <div className="flex flex-col items-center w-full min-h-screen bg-[#030407] relative overflow-hidden">
      {/* Mesh Glow Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] bg-cyan-900/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-[40%] h-[40%] bg-purple-950/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-8 pt-32 pb-24 text-center flex flex-col items-center z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/30 px-5 py-2 text-xs font-semibold text-purple-300 backdrop-blur-xl mb-10 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
          <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-ping" />
          Stable Release v1.0.0 is Live
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-100 to-purple-400 mb-8 leading-[1.08] max-w-4xl">
          Switchable Brain.<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.15)]">Without Losing Memory.</span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-gray-400 font-medium mb-12 leading-relaxed">
          Use any AI model. Switch providers instantly. Keep your conversations, memories, tools, and workflows in one place. Privacy-first, local-first, and model-agnostic.
        </p>

        <div className="flex flex-wrap gap-6 justify-center mb-20">
          <a
            href="#downloads"
            className="rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 px-10 py-4 text-base font-bold shadow-[0_4px_25px_rgba(168,85,247,0.35)] hover:shadow-[0_4px_35px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Download v1.0.0
          </a>
          <Link
            to="/docs"
            className="rounded-full bg-white/[0.03] border border-white/10 px-10 py-4 text-base font-bold hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            View Docs
          </Link>
        </div>

        {/* CLI Terminal Mockup */}
        <div className="w-full max-w-4xl rounded-2xl border border-white/[0.06] bg-black/50 backdrop-blur-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] text-left font-mono text-sm leading-relaxed text-gray-300">
          <div className="border-b border-white/[0.06] bg-white/[0.03] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-xs text-gray-500 font-medium">agathi@tu2pu-cli:~</span>
            <div className="w-12" /> {/* spacing element */}
          </div>
          <div className="p-8 space-y-4 text-base bg-gradient-to-b from-transparent to-purple-950/[0.05]">
            <div><span className="text-purple-400">$</span> npm install -g tu2pu</div>
            <div className="text-gray-500">✓ Installed tu2pu CLI v1.0.0</div>
            <div><span className="text-purple-400">$</span> tu2pu doctor</div>
            <div className="text-emerald-400">  ✔ CLI runtime OK</div>
            <div className="text-emerald-400">  ✔ agent_runtime loaded</div>
            <div className="text-emerald-400">  ✔ database connection established</div>
            <div><span className="text-purple-400">$</span> tu2pu interactive</div>
            <div className="text-purple-400 font-bold">
              tu2pu Operating Layer | Switchable Brain Active
            </div>
            <div className="text-gray-400">/session chat_session_01</div>
            <div><span className="text-purple-400">&gt;</span> Prompt: Refactor the auth service.</div>
          </div>
        </div>
      </section>

      {/* Switchable Brain Section */}
      <section className="w-full max-w-6xl px-8 py-28 border-t border-white/[0.05] z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              One Brain.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Any Model.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Changing model providers usually means losing conversation histories, contextual workspace files, and custom tooling setups. tu2pu decouples your memory and local tools into a persistent local agent layer, enabling you to switch between local/cloud AI backends instantly.
            </p>
            <div className="space-y-4 pt-4">
              {[
                "Persistent SQLite message logs & file indexes",
                "Model-agnostic task-scheduler workflow automation",
                "Built-in workspace builder & RAG engine context prioritizer"
              ].map((text, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="h-6 w-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold shrink-0 mt-0.5">✓</div>
                  <span className="text-base font-semibold text-gray-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-10 flex flex-col gap-8 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-500" />
            <h3 className="text-xs font-bold tracking-widest text-purple-400 uppercase">Interactive Switchable Brain</h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { name: "Google Gemini", active: true },
                { name: "OpenAI GPT-4", active: false },
                { name: "Anthropic Claude", active: false },
                { name: "Local Ollama Llama3", active: false }
              ].map((p, idx) => (
                <button
                  key={idx}
                  className={`p-5 rounded-2xl border text-left transition-all duration-300 ${
                    p.active
                      ? "border-purple-500/40 bg-purple-950/30 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      : "border-white/[0.05] bg-white/[0.02] text-gray-400 hover:border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Provider</div>
                  <div className="font-bold text-base">{p.name}</div>
                </button>
              ))}
            </div>
            <div className="border-t border-white/[0.06] pt-6 text-center text-xs text-gray-500 font-medium">
              The underlying database, tool routing, and contexts remain 100% active.
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-6xl px-8 py-28 border-t border-white/[0.05] z-10">
        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4 text-center">Architected for Production</h2>
        <p className="text-gray-400 text-center mb-16 max-w-lg mx-auto text-base">Everything you need to orchestrate complex local AI actions cleanly.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: "Switchable Brain", desc: "Change LLM model adaptors instantly without resetting session histories or token parameters." },
            { title: "Local First & Secure", desc: "All state records, file scans, and session DB databases reside locally on your host environment." },
            { title: "Context OS Engine", desc: "Smart contextual assembler with priority rank budgeting to compress prompts automatically." },
            { title: "OpenAI Compatible", desc: "Exposes standardized endpoint routing enabling seamless integration with any standard IDE." },
            { title: "Workflow Automation", desc: "Autonomous task pipeline scheduler with retry checks and self-correction trust mechanisms." },
            { title: "Enterprise Controls", desc: "Generate, rotate, and revoke local API keys with telemetry logging tools built in." }
          ].map((feat, idx) => (
            <div key={idx} className="p-8 rounded-2xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300 hover:translate-y-[-2px] group">
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Models Directory */}
      <section className="w-full max-w-6xl px-8 py-28 border-t border-white/[0.05] z-10">
        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4 text-center">Supported Model Registry</h2>
        <p className="text-gray-400 text-center mb-16 max-w-md mx-auto text-base">
          Queried directly from your active local registry catalog.
        </p>

        <div className="mb-10 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Search models or providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/[0.03] px-6 py-4 text-sm focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-2xl shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03] text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-6">Model Name</th>
                <th className="p-6">Provider</th>
                <th className="p-6">Context Limit</th>
                <th className="p-6">Capabilities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm text-gray-300">
              {filteredModels.length > 0 ? (
                filteredModels.map((m: any, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-6 font-bold text-white text-base">{m.name || "Default Model"}</td>
                    <td className="p-6 text-gray-400">{m.provider || "Local"}</td>
                    <td className="p-6 font-mono text-xs">{m.context_size || "128k"}</td>
                    <td className="p-6">
                      <div className="flex gap-2.5">
                        {m.capabilities?.vision && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Vision</span>}
                        {m.capabilities?.reasoning && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Reasoning</span>}
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Coding</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500 text-base">
                    No active models matching search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="w-full max-w-6xl px-8 py-28 border-t border-white/[0.05] z-10">
        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4 text-center">Download Releases</h2>
        <p className="text-gray-400 text-center mb-16 max-w-md mx-auto text-base">
          Get the stable release binary distribution package.
        </p>

        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {releases.map((rel: any, idx) => (
            <div key={idx} className="p-10 rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl flex flex-col justify-between hover:border-white/10 transition-colors shadow-lg relative group">
              <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-cyan-500/5 rounded-full blur-[30px] pointer-events-none" />
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Platform</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v{rel.version}</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{rel.platform}</h3>
                <div className="text-[10px] text-gray-500 mb-6 font-mono break-all bg-black/40 p-4 rounded-xl border border-white/[0.06] leading-relaxed">
                  <span className="text-purple-400 font-bold block mb-1">SHA256 CHECKSUM:</span>
                  {rel.checksum}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-8">{rel.notes}</p>
              </div>

              <a
                href={`/${rel.filename}`}
                download={rel.filename}
                className="w-full rounded-2xl bg-white text-black py-4 text-center text-base font-bold hover:bg-gray-200 transition-colors shadow-md block"
              >
                Download Package
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Installation Tab Snippets */}
      <section className="w-full max-w-4xl px-8 py-28 border-t border-white/[0.05] text-center z-10">
        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-12">Quick Installation</h2>
        <div className="border border-white/[0.06] bg-white/[0.01] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
          <div className="flex border-b border-white/[0.06] bg-white/[0.02] text-base text-gray-400">
            {["linux", "windows", "source"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-bold capitalize border-b-2 transition-all duration-300 ${
                  activeTab === tab
                    ? "border-purple-500 text-white bg-purple-950/20"
                    : "border-transparent hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-10 text-left font-mono text-base bg-black/10 text-gray-300 leading-loose">
            {activeTab === "linux" && (
              <div className="space-y-3">
                <div className="text-gray-500 font-semibold"># Fetch installer and install globally</div>
                <div><span className="text-purple-400">$</span> npm install -g tu2pu</div>
                <div><span className="text-purple-400">$</span> tu2pu doctor</div>
              </div>
            )}
            {activeTab === "windows" && (
              <div className="space-y-3">
                <div className="text-gray-500 font-semibold"># Open PowerShell and run</div>
                <div><span className="text-purple-400">$</span> npm install --global tu2pu</div>
                <div><span className="text-purple-400">$</span> tu2pu.cmd doctor</div>
              </div>
            )}
            {activeTab === "source" && (
              <div className="space-y-3">
                <div className="text-gray-500 font-semibold"># Clone repository, build, and link</div>
                <div><span className="text-purple-400">$</span> git clone https://github.com/ilaiyar/thudupu-ai.git</div>
                <div><span className="text-purple-400">$</span> cd thudupu-ai</div>
                <div><span className="text-purple-400">$</span> npm install && npm run build</div>
                <div><span className="text-purple-400">$</span> npm link</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Creator Shoutout */}
      <section className="w-full bg-gradient-to-b from-transparent to-black py-20 border-t border-white/[0.05] text-center px-8 z-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">LLM Orchestration Revolution</h2>
        <p className="text-gray-400 max-w-lg mx-auto text-base leading-relaxed mb-8">
          This unified state and context management orchestration layer was built by **Ilaiyar Solutions** to redefine the future of large language model agent execution.
        </p>
        <div className="inline-flex items-center gap-3 text-xs font-bold text-gray-500 tracking-widest">
          POWERED BY <span className="text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">ILAIYAR SOLUTIONS</span>
        </div>
      </section>
    </div>
  );
}
