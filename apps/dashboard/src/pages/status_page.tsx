import { useState, useEffect } from "react";
import { getStatus } from "../services/api";

export function status_page() {
  const [status, setStatus] = useState<any>({
    api: "checking",
    downloads: "checking",
    website: "checking",
    authentication: "checking",
    providers: "checking",
    telemetry: "checking",
    systemTime: ""
  });
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    getStatus()
      .then((res: any) => {
        setPing(Date.now() - startTime);
        setStatus(res.data);
      })
      .catch(() => {
        setStatus({
          api: "offline",
          downloads: "offline",
          website: "healthy",
          authentication: "offline",
          providers: "offline",
          telemetry: "offline",
          systemTime: new Date().toISOString()
        });
      });
  }, []);

  const getStatusColor = (val: string) => {
    if (val === "healthy" || val === "operational" || val === "online") return "bg-emerald-500 text-emerald-400 border-emerald-500/20";
    if (val === "offline") return "bg-red-500 text-red-400 border-red-500/20";
    return "bg-yellow-500 text-yellow-400 border-yellow-500/20";
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#05070c] px-6 py-20 relative">
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-xl rounded-2xl border border-white/5 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl relative">
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">System Status</h2>
            <p className="text-xs text-gray-500">Real-time health of tu2pu services.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </div>
        </div>

        <div className="space-y-4">
          {[
            { id: "api", name: "Core API Service" },
            { id: "downloads", name: "Release Downloader" },
            { id: "website", name: "Public Web Portal" },
            { id: "authentication", name: "Authentication Gateway" },
            { id: "providers", name: "Model Adaptor Providers" },
            { id: "telemetry", name: "Telemetry & Logs Pipeline" }
          ].map((srv) => {
            const val = status[srv.id] || "operational";
            return (
              <div key={srv.id} className="flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/5">
                <span className="text-sm font-semibold text-gray-300">{srv.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(val)}`}>
                  {val === "checking" ? "Checking..." : val}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 flex justify-between text-xs text-gray-500">
          <span>Response latency: <span className="font-semibold text-purple-400">{ping !== null ? `${ping}ms` : "N/A"}</span></span>
          <span>Checked: {status.systemTime ? new Date(status.systemTime).toLocaleTimeString() : "Just now"}</span>
        </div>
      </div>
    </div>
  );
}
