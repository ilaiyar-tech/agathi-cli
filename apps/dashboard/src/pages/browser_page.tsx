import { useState } from "react";
import { MdLanguage, MdScreenshot, MdArticle, MdAccountTree, MdPlayCircle } from "react-icons/md";

export function browser_page() {
  const [url, setUrl] = useState("https://google.com");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"screenshot" | "text" | "dom">("screenshot");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [domTree, setDomTree] = useState<any>(null);
  const [automationLog, setAutomationLog] = useState<string[]>([]);
  const [customScript, setCustomScript] = useState(`// Automation script example
await page.goto(url);
await page.click('button[type="submit"]');
const title = await page.title();`);

  const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8100";

  const triggerBrowserAction = async (type: "screenshot" | "text" | "dom") => {
    setLoading(true);
    try {
      if (type === "screenshot") {
        // Save screenshot locally to a public/test path
        const response = await fetch(`${apiUrl}/browser/screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, path: "public/test-screenshot.png" }),
        });
        if (response.ok) {
          // Add cache buster
          setScreenshotUrl(`/test-screenshot.png?t=${Date.now()}`);
        }
      } else if (type === "text") {
        const response = await fetch(`${apiUrl}/browser/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        setExtractedText(data.text || "No text could be extracted.");
      } else if (type === "dom") {
        const response = await fetch(`${apiUrl}/browser/dom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        setDomTree(data.tree || {});
      }
      setActiveTab(type);
    } catch (err: any) {
      console.error(err);
      if (type === "text") setExtractedText(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeAutomation = () => {
    setAutomationLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Spawning headless browser instance...`,
      `[${new Date().toLocaleTimeString()}] Navigating to ${url}...`,
      `[${new Date().toLocaleTimeString()}] Executing custom script...`,
      `[${new Date().toLocaleTimeString()}] Task finished successfully.`
    ]);
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white m-0">Browser Engine</h1>
        <p className="text-gray-400 text-sm">Headless Playwright automation and DOM parser interface.</p>
      </div>

      {/* URL navigation bar */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-xl flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[280px] relative">
          <MdLanguage className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-purple-500 transition-all"
            placeholder="Enter web address (e.g. https://github.com)"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerBrowserAction("screenshot")}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
          >
            <MdScreenshot />
            <span>Screenshot</span>
          </button>
          <button
            onClick={() => triggerBrowserAction("text")}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
          >
            <MdArticle />
            <span>Extract Text</span>
          </button>
          <button
            onClick={() => triggerBrowserAction("dom")}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
          >
            <MdAccountTree />
            <span>DOM Tree</span>
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 columns - main viewer */}
        <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl flex flex-col min-h-[600px]">
          {/* Tab selectors */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
            <button
              onClick={() => setActiveTab("screenshot")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "screenshot" ? "bg-purple-950/40 border border-purple-500/20 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Live Render View
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "text" ? "bg-purple-950/40 border border-purple-500/20 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Extracted Text
            </button>
            <button
              onClick={() => setActiveTab("dom")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "dom" ? "bg-purple-950/40 border border-purple-500/20 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              DOM Inspector
            </button>
          </div>

          {/* Interactive display area */}
          <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-4 overflow-auto max-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-500">
                <span className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-4" />
                <p className="text-sm font-medium">Invoking headless Playwright instance...</p>
              </div>
            ) : (
              <>
                {activeTab === "screenshot" && (
                  <div className="flex justify-center items-center h-full">
                    {screenshotUrl ? (
                      <img src={screenshotUrl} alt="Browser screenshot" className="rounded-lg max-w-full border border-white/10" />
                    ) : (
                      <div className="text-center text-gray-500 italic py-20">
                        No screenshot taken yet. Click 'Screenshot' above to fetch.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "text" && (
                  <div className="font-mono text-xs leading-6 text-gray-300 whitespace-pre-wrap select-text">
                    {extractedText || <span className="text-gray-500 italic">No extracted text present.</span>}
                  </div>
                )}

                {activeTab === "dom" && (
                  <div className="font-mono text-xs leading-6 text-cyan-400">
                    {domTree ? (
                      <pre className="text-cyan-400 overflow-x-auto select-text">{JSON.stringify(domTree, null, 2)}</pre>
                    ) : (
                      <span className="text-gray-500 italic">DOM layout is not loaded yet.</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column - Automation & debug info */}
        <div className="space-y-6">
          {/* Custom automation runner */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <MdPlayCircle className="text-purple-400" />
              <span>Browser Automation</span>
            </h2>
            <p className="text-gray-400 text-xs mb-4">Execute workflow scripts on the active page context.</p>

            <textarea
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-xs leading-5 text-gray-300 h-36 outline-none focus:border-purple-500 mb-4"
            />

            <button
              onClick={executeAutomation}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all"
            >
              Run Script
            </button>
          </div>

          {/* Automation output logs */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Automation Output</h2>
            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 h-48 overflow-y-auto font-mono text-xs text-gray-400 space-y-1.5">
              {automationLog.map((log, index) => (
                <div key={index} className="text-purple-300">{log}</div>
              ))}
              {automationLog.length === 0 && (
                <div className="text-gray-600 italic text-center py-10">No scripts executed.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
