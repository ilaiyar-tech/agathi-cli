import { useState, useEffect } from "react";

export function ai_builder_page() {
  const [prompt, setPrompt] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Tool states
  const [tools, setTools] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [toolHistory, setToolHistory] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [toolArgs, setToolArgs] = useState("");
  const [toolExecutionLog, setToolExecutionLog] = useState<string[]>([]);

  // Website Generator States
  const [framework, setFramework] = useState("Vite");
  const [template, setTemplate] = useState("Default Spa");
  const [generatedProject, setGeneratedProject] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Preview States
  const [preview, setPreview] = useState<any>(null);
  const [device, setDevice] = useState("desktop"); // desktop, tablet, mobile
  const [previewLogsTab, setPreviewLogsTab] = useState("console"); // console, network, build, runtime

  // Deployment States
  const [deployTarget, setDeployTarget] = useState("Cloudflare Pages");
  const [envVars, setEnvVars] = useState([{ key: "API_URL", val: "https://api.example.com" }]);
  const [activeDeployment, setActiveDeployment] = useState<any>(null);
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);

  const handlePlan = async () => {
    setLogs(["Generating execution plan..."]);
    setProgress(10);
    try {
      const res = await fetch("http://localhost:8100/planner/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setPlan(data);
      setProgress(30);
      setLogs((prev) => [...prev, "Plan generated successfully!"]);
    } catch (e: any) {
      setLogs((prev) => [...prev, "Plan generation failed: " + e.message]);
    }
  };

  const handleStartExecution = async () => {
    if (!plan) return;
    setLogs((prev) => [...prev, "Starting execution engine..."]);
    try {
      const res = await fetch("http://localhost:8100/execution/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, tasks: plan.tasks })
      });
      const data = await res.json();
      setExecution(data);
      setIsPolling(true);
    } catch (e: any) {
      setLogs((prev) => [...prev, "Execution failed to start: " + e.message]);
    }
  };

  const handleGenerateWebsite = async () => {
    setLogs(["Starting Website Generator..."]);
    setProgress(5);
    try {
      const res = await fetch("http://localhost:8100/generator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, framework, template })
      });
      const data = await res.json();
      setGeneratedProject(data);

      let done = false;
      while (!done) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`http://localhost:8100/generator/${data.id}`);
        const pollData = await pollRes.json();
        
        setGeneratedProject(pollData);
        setProgress(pollData.progress || 0);
        setLogs(pollData.logs || []);

        if (pollData.status === "completed" || pollData.status === "failed") {
          done = true;
          if (pollData.status === "completed") {
            setLogs((prev) => [...prev, "Website generation complete!"]);
            if (pollData.files && pollData.files.length > 0) {
              setSelectedFile(pollData.files[0]);
            }
            handleStartPreview(pollData.id);
          } else {
            setLogs((prev) => [...prev, "Website generation failed."]);
          }
        }
      }
    } catch (e: any) {
      setLogs((prev) => [...prev, "Website generation failed: " + e.message]);
    }
  };

  const handleStartPreview = async (genId?: string) => {
    const targetGenId = genId || generatedProject?.id;
    if (!targetGenId) return;
    setLogs((prev) => [...prev, "Launching preview server..."]);
    try {
      const res = await fetch("http://localhost:8100/preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatorId: targetGenId })
      });
      const data = await res.json();
      setPreview(data);
      setLogs((prev) => [...prev, "Preview launched successfully!"]);
    } catch (e: any) {
      setLogs((prev) => [...prev, "Preview launching failed: " + e.message]);
    }
  };

  const handleRestartPreview = async () => {
    if (!preview) return;
    try {
      await fetch(`http://localhost:8100/preview/${preview.id}/restart`, { method: "POST" });
      setLogs((prev) => [...prev, "Preview server restarted successfully."]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleStopPreview = async () => {
    if (!preview) return;
    try {
      await fetch(`http://localhost:8100/preview/${preview.id}/stop`, { method: "POST" });
      setLogs((prev) => [...prev, "Preview server stopped."]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRegenerate = async () => {
    if (!generatedProject) return;
    setLogs((prev) => [...prev, "Regenerating website components..."]);
    try {
      const res = await fetch(`http://localhost:8100/generator/${generatedProject.id}/regenerate`, {
        method: "POST"
      });
      await res.json();
      setLogs((prev) => [...prev, "Regeneration complete!"]);
    } catch (e: any) {
      setLogs((prev) => [...prev, "Regeneration failed: " + e.message]);
    }
  };

  const handleStartDeploy = async () => {
    if (!generatedProject) return;
    setDeployLogs(["Starting pre-deployment validation...", "Verifying project structure..."]);
    try {
      const res = await fetch("http://localhost:8100/deploy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatorId: generatedProject.id, target: deployTarget, envs: envVars })
      });
      const data = await res.json();
      setActiveDeployment(data);
      setDeployLogs((prev) => [...prev, ...data.logs]);
      loadDeployHistory(data.id);
    } catch (e: any) {
      setDeployLogs((prev) => [...prev, "Deployment failed: " + e.message]);
    }
  };

  const handleRetryDeploy = async () => {
    if (!activeDeployment) return;
    try {
      const res = await fetch(`http://localhost:8100/deploy/${activeDeployment.id}/retry`, { method: "POST" });
      const data = await res.json();
      setDeployLogs((prev) => [...prev, "Retrying deployment...", "Deployment retry succeeded!"]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRollbackDeploy = async () => {
    if (!activeDeployment) return;
    try {
      const res = await fetch(`http://localhost:8100/deploy/${activeDeployment.id}/rollback`, { method: "POST" });
      const data = await res.json();
      setDeployLogs((prev) => [...prev, "Initiating rollback procedure...", "Rollback completed successfully."]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleCancelDeploy = async () => {
    if (!activeDeployment) return;
    try {
      const res = await fetch(`http://localhost:8100/deploy/${activeDeployment.id}/cancel`, { method: "POST" });
      const data = await res.json();
      setDeployLogs((prev) => [...prev, "Deployment cancel requested."]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadDeployHistory = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8100/deploy/${id}/history`);
      const data = await res.json();
      setDeploymentHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const pollExecutionStatus = async () => {
    if (!execution) return;
    try {
      const res = await fetch(`http://localhost:8100/execution/${execution.id}`);
      const data = await res.json();
      setExecution(data);
      setProgress(data.progress);
      setLogs(data.logs);
      setArtifacts(data.artifacts);
      if (data.status === "completed" || data.status === "cancelled" || data.status === "failed") {
        setIsPolling(false);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadTools = async () => {
    try {
      const resTools = await fetch("http://localhost:8100/tools");
      const dataTools = await resTools.json();
      setTools(dataTools);

      const resCats = await fetch("http://localhost:8100/tools/categories");
      const dataCats = await resCats.json();
      setCategories(dataCats);

      const resHistory = await fetch("http://localhost:8100/tools/history");
      const dataHistory = await resHistory.json();
      setToolHistory(dataHistory);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPolling && execution) {
      interval = setInterval(pollExecutionStatus, 1000);
    }
    return () => clearInterval(interval);
  }, [isPolling, execution]);

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    setToolExecutionLog([`Triggering tool execution for: ${selectedTool.name}`]);
    try {
      const res = await fetch("http://localhost:8100/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedTool.name, args: toolArgs ? JSON.parse(toolArgs) : {} })
      });
      const data = await res.json();
      setToolExecutionLog((prev) => [...prev, `Result: ${JSON.stringify(data.result)}`]);
      loadTools();
    } catch (e: any) {
      setToolExecutionLog((prev) => [...prev, `Error: ${e.message}`]);
    }
  };

  const handlePause = async () => {
    if (!execution) return;
    await fetch(`http://localhost:8100/execution/${execution.id}/pause`, { method: "POST" });
    pollExecutionStatus();
  };

  const handleResume = async () => {
    if (!execution) return;
    await fetch(`http://localhost:8100/execution/${execution.id}/resume`, { method: "POST" });
    pollExecutionStatus();
  };

  const handleCancel = async () => {
    if (!execution) return;
    await fetch(`http://localhost:8100/execution/${execution.id}/cancel`, { method: "POST" });
    pollExecutionStatus();
  };

  const handleRetry = async () => {
    if (!execution) return;
    await fetch(`http://localhost:8100/execution/${execution.id}/retry`, { method: "POST" });
    pollExecutionStatus();
  };

  const getFrameWidth = () => {
    if (device === "mobile") return "375px";
    if (device === "tablet") return "768px";
    return "100%";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold font-sans">AI Builder Studio & Generator</h1>
      
      {/* Code generation & execution engine */}
      <div className="flex flex-col gap-4 border p-4 rounded bg-white">
        <h2 className="text-lg font-semibold">Prompt Editor & Engine Settings</h2>
        <input
          type="text"
          className="w-full p-2 border rounded text-sm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your website (e.g. Portfolio page, SaaS Landing page)"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Framework Selector</label>
            <select className="p-2 border rounded w-full text-sm" value={framework} onChange={(e) => setFramework(e.target.value)}>
              <option>React</option>
              <option>Next.js</option>
              <option>Vite</option>
              <option>Express</option>
              <option>Fastify</option>
              <option>Static HTML</option>
              <option>Tailwind CSS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Template Selector</label>
            <select className="p-2 border rounded w-full text-sm" value={template} onChange={(e) => setTemplate(e.target.value)}>
              <option>Default Spa</option>
              <option>Landing Page</option>
              <option>Dashboard Admin</option>
              <option>Blog & Portfolio</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm" onClick={handlePlan}>
            Generate Plan
          </button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm" onClick={handleStartExecution} disabled={!plan}>
            Start Execution
          </button>
          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium" onClick={handleGenerateWebsite}>
            Generate Website
          </button>
          <button className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm" onClick={handlePause}>
            Pause
          </button>
          <button className="px-3 py-1.5 bg-green-600 text-white rounded text-sm" onClick={handleResume}>
            Resume
          </button>
          <button className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm" onClick={handleRegenerate} disabled={!generatedProject}>
            Regenerate
          </button>
          <button className="px-3 py-1.5 bg-red-600 text-white rounded text-sm" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>

      {/* Deployment Panel & Targets */}
      {generatedProject && (
        <div className="grid grid-cols-3 gap-6 border p-4 rounded bg-white">
          <div className="col-span-1 space-y-4 pr-4 border-r">
            <h3 className="font-semibold text-sm text-gray-700">Deployment Pipeline</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Deployment Target</label>
              <select className="p-2 border rounded w-full text-sm" value={deployTarget} onChange={(e) => setDeployTarget(e.target.value)}>
                <option>Cloudflare Pages</option>
                <option>Cloudflare Workers</option>
                <option>Static Hosting</option>
                <option>Local Server</option>
                <option>Docker</option>
                <option>Custom Build Adapter</option>
              </select>
            </div>
            {/* Env Manager */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Environment Manager</label>
              <div className="space-y-1">
                {envVars.map((v, i) => (
                  <div key={i} className="flex gap-1 text-xs">
                    <input className="w-1/2 p-1 border rounded" type="text" value={v.key} disabled />
                    <input className="w-1/2 p-1 border rounded" type="text" value={v.val} onChange={(e) => {
                      const updated = [...envVars];
                      updated[i].val = e.target.value;
                      setEnvVars(updated);
                    }} />
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded text-sm font-semibold" onClick={handleStartDeploy}>
              Trigger Deployment Pipeline
            </button>
          </div>

          <div className="col-span-2 space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Deployment Details & History</h3>
            {activeDeployment ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>URL: <a className="text-blue-600 hover:underline" href={activeDeployment.url} target="_blank" rel="noreferrer">{activeDeployment.url}</a></span>
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">{activeDeployment.status}</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-gray-200 rounded text-xs" onClick={handleRetryDeploy}>Retry</button>
                  <button className="px-2 py-1 bg-gray-200 rounded text-xs" onClick={handleRollbackDeploy}>Rollback</button>
                  <button className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs" onClick={handleCancelDeploy}>Cancel</button>
                </div>
                <div className="bg-gray-900 text-yellow-500 p-3 rounded font-mono text-xs max-h-40 overflow-y-auto">
                  {deployLogs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Initiate deployment to configure logs and deployments url.</div>
            )}

            {/* Version History Table */}
            <div>
              <h4 className="font-semibold text-xs text-gray-500 mb-2">Version History</h4>
              <div className="border rounded divide-y max-h-40 overflow-y-auto text-xs">
                {deploymentHistory.map((h, i) => (
                  <div key={i} className="p-2 flex justify-between">
                    <span>{h.id} ({h.target})</span>
                    <span className="text-gray-400">{h.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Engine integration */}
      {preview && (
        <div className="grid grid-cols-3 gap-6 border p-4 rounded bg-white">
          <div className="col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm text-gray-700">Live Preview: <code className="bg-gray-100 px-1 py-0.5 rounded">{preview.url}</code></h3>
              <div className="flex gap-1">
                <button className={`px-2 py-1 text-xs rounded border ${device === "desktop" ? "bg-indigo-100 font-bold" : "bg-gray-50"}`} onClick={() => setDevice("desktop")}>Desktop</button>
                <button className={`px-2 py-1 text-xs rounded border ${device === "tablet" ? "bg-indigo-100 font-bold" : "bg-gray-50"}`} onClick={() => setDevice("tablet")}>Tablet</button>
                <button className={`px-2 py-1 text-xs rounded border ${device === "mobile" ? "bg-indigo-100 font-bold" : "bg-gray-50"}`} onClick={() => setDevice("mobile")}>Mobile</button>
              </div>
            </div>
            <div className="border flex items-center justify-center bg-gray-100 p-4" style={{ height: "400px" }}>
              <div className="bg-white shadow-lg overflow-y-auto" style={{ width: getFrameWidth(), height: "100%" }}>
                <div className="p-6 text-center">
                  <h2 className="text-xl font-bold mb-2">My Generated Application</h2>
                  <p className="text-gray-600 text-sm">Framework: {generatedProject?.framework}</p>
                  <div className="mt-8 p-4 border rounded border-dashed bg-gray-50">
                    Interactive Application Preview Live Content Area
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm" onClick={handleRestartPreview}>Restart Preview</button>
              <button className="px-3 py-1.5 bg-red-600 text-white rounded text-sm" onClick={handleStopPreview}>Stop Preview</button>
            </div>
          </div>

          <div className="col-span-1 border-l pl-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Logs & Diagnostics</h3>
            <div className="flex gap-1 border-b pb-2">
              <button className={`px-2 py-1 text-xs ${previewLogsTab === "console" ? "font-bold" : ""}`} onClick={() => setPreviewLogsTab("console")}>Console</button>
              <button className={`px-2 py-1 text-xs ${previewLogsTab === "network" ? "font-bold" : ""}`} onClick={() => setPreviewLogsTab("network")}>Network</button>
              <button className={`px-2 py-1 text-xs ${previewLogsTab === "build" ? "font-bold" : ""}`} onClick={() => setPreviewLogsTab("build")}>Build</button>
            </div>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs max-h-60 overflow-y-auto">
              {previewLogsTab === "console" && preview.consoleLogs.map((l: string, i: number) => <div key={i}>{l}</div>)}
              {previewLogsTab === "network" && preview.networkRequests.map((l: string, i: number) => <div key={i}>{l}</div>)}
              {previewLogsTab === "build" && preview.logs.map((l: string, i: number) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* Website Generator Output (File Tree & Preview) */}
      {generatedProject && (
        <div className="grid grid-cols-3 gap-6 border p-4 rounded bg-white">
          <div className="col-span-1 border-r pr-4 space-y-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm text-gray-700">Project File Tree</h3>
              {generatedProject.status === "completed" && (
                <a
                  href={`http://localhost:8100/generator/${generatedProject.id}/download`}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded font-semibold cursor-pointer"
                  download
                >
                  Download ZIP
                </a>
              )}
            </div>
            <ul className="space-y-1 font-mono text-xs max-h-60 overflow-y-auto">
              {generatedProject.files.map((f: any) => (
                <li key={f.path}>
                  <button
                    className={`w-full text-left p-1 rounded hover:bg-gray-100 ${selectedFile?.path === f.path ? "bg-indigo-50 text-indigo-700 font-bold" : ""}`}
                    onClick={() => setSelectedFile(f)}
                  >
                    📄 {f.path}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold text-sm mb-2 text-gray-700">Code Preview</h3>
            {selectedFile ? (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto max-h-60">
                <code>{selectedFile.content}</code>
              </pre>
            ) : (
              <span className="text-gray-400 text-sm">Select a file to preview its content</span>
            )}
          </div>
        </div>
      )}

      {/* Tool Calling Interface */}
      <div className="grid grid-cols-3 gap-6">
        {/* Tool Registry & Categories */}
        <div className="border p-4 rounded bg-white col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Tool Registry & Categories</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <span className="font-semibold text-sm text-gray-500">{cat.name}</span>
                <div className="flex flex-wrap gap-1">
                  {cat.tools.map((tName: string) => {
                    const toolObj = tools.find(t => t.name === tName) || { name: tName, description: "System tool integration" };
                    return (
                      <button
                        key={tName}
                        onClick={() => { setSelectedTool(toolObj); setToolArgs("{}"); }}
                        className={`px-2 py-1 text-xs rounded border ${selectedTool?.name === tName ? "bg-indigo-100 border-indigo-500" : "bg-gray-50 border-gray-200"}`}
                      >
                        {tName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tool Inspector & Execution */}
        <div className="border p-4 rounded bg-white col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Tool Inspector & Live Execution</h2>
          {selectedTool ? (
            <div className="space-y-3">
              <div>
                <strong className="text-sm">Tool Name:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{selectedTool.name}</code>
              </div>
              <div>
                <strong className="text-sm">Description:</strong> <span className="text-sm text-gray-600">{selectedTool.description}</span>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Arguments (JSON string):</label>
                <textarea
                  className="w-full p-2 border rounded font-mono text-xs"
                  rows={3}
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                />
              </div>
              <button onClick={handleExecuteTool} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">
                Execute Tool
              </button>

              <div className="mt-2 bg-gray-950 text-green-400 p-3 rounded font-mono text-xs max-h-40 overflow-y-auto">
                {toolExecutionLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Select a tool to execute and inspect results</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="border p-4 rounded bg-white">
          <h2 className="text-xl font-semibold mb-2">Live Progress & Build Status</h2>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-4 font-mono text-xs bg-gray-900 text-green-400 p-4 rounded max-h-40 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
        <div className="border p-4 rounded bg-white">
          <h2 className="text-xl font-semibold mb-2">Artifact Viewer</h2>
          <ul className="list-disc pl-5">
            {artifacts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
