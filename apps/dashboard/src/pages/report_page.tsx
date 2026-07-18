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
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#030407] px-8 py-24 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-3xl rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-10 md:p-14 shadow-2xl relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-3 text-center">Diagnostics & Bug Reporter</h2>
        <p className="text-gray-400 text-base text-center mb-12 font-medium">
          Submit issues, crashes, or feature requests. Diagnostic metadata will be collected automatically.
        </p>

        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-400">
            ⚠ {error}
          </div>
        )}

        {success && (
          <div className="mb-8 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm font-semibold text-purple-400">
            ✔ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Report Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option>Bug</option>
                <option>Crash</option>
                <option>Suggestion</option>
                <option>Feature Request</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">CLI Version</label>
              <input
                type="text"
                disabled
                value={envInfo.cliVersion}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-gray-500 cursor-not-allowed font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain the bug, steps to reproduce, or requested feature in detail..."
              required
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-base text-white focus:outline-none focus:border-purple-500/50 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Workspace Logs (Optional)</label>
            <textarea
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              placeholder="Paste terminal outputs or execution logs here..."
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs text-purple-300 focus:outline-none focus:border-purple-500/50 font-mono leading-relaxed shadow-inner"
            />
          </div>

          {/* Auto collected system metadata */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] space-y-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Auto-Collected Metadata</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-gray-400 font-mono">
              <div>OS/Platform: <span className="text-gray-300 font-semibold">{envInfo.os}</span></div>
              <div>Browser: <span className="text-gray-300 font-semibold truncate block max-w-[220px]">{envInfo.browser}</span></div>
              <div className="col-span-2">API Engine: <span className="text-gray-300 font-semibold">tu2pu_server {envInfo.apiVersion}</span></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-white text-black py-4 text-base font-bold hover:bg-gray-200 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? "Submitting..." : "Submit Diagnostics Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
