import { useState, useEffect } from "react";
import { submitReport, system as getSystem } from "../services/api";

export function report_page() {
  const [kind, setKind] = useState("Bug");
  const [description, setDescription] = useState("");
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Auto collected environmental variables
  const [envInfo, setEnvInfo] = useState<any>({
    os: navigator.platform,
    browser: navigator.userAgent,
    cliVersion: "v1.0.0",
    apiVersion: "v1.0.0"
  });

  useEffect(() => {
    getSystem()
      .then((res: any) => {
        setEnvInfo((prev: any) => ({
          ...prev,
          os: res.data.os || prev.os,
          cliVersion: res.data.version || prev.cliVersion,
          apiVersion: res.data.version || prev.apiVersion
        }));
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        kind,
        description,
        logs,
        metadata: envInfo
      };
      const res = await submitReport(payload);
      setSuccess(`Report submitted successfully. Reference ID: ${res.data.id}`);
      setDescription("");
      setLogs("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#05070c] px-6 py-20 relative">
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-2xl rounded-2xl border border-white/5 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl relative">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">Diagnostics & Bug Reporter</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Submit issues, crashes, or feature requests. Diagnostic metadata will be collected automatically.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
            ⚠ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-400">
            ✔ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Report Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option>Bug</option>
                <option>Crash</option>
                <option>Suggestion</option>
                <option>Feature Request</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">CLI Version</label>
              <input
                type="text"
                disabled
                value={envInfo.cliVersion}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain the bug, steps to reproduce, or requested feature in detail..."
              required
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Workspace Logs (Optional)</label>
            <textarea
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              placeholder="Paste terminal outputs or execution logs here..."
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-purple-300 focus:outline-none focus:border-purple-500/50 font-mono"
            />
          </div>

          {/* Auto collected system metadata */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Auto-Collected Metadata</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-400 font-mono">
              <div>OS/Platform: <span className="text-gray-300">{envInfo.os}</span></div>
              <div>Browser: <span className="text-gray-300 truncate block max-w-[200px]">{envInfo.browser}</span></div>
              <div>API Engine: <span className="text-gray-300">tu2pu_server {envInfo.apiVersion}</span></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-3 text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "Submitting..." : "Submit Diagnostics Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
