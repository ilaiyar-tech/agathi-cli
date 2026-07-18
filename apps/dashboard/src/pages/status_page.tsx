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
    if (val === "healthy" || val === "operational" || val === "online") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (val === "offline") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#030407] px-8 py-24 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-2xl rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-10 md:p-12 shadow-2xl relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        <div className="flex justify-between items-center mb-10 border-b border-white/[0.06] pb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white">System Status</h2>
            <p className="text-sm text-gray-500 font-medium">Real-time health of tu2pu services.</p>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold tracking-wide">
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
              <div key={srv.id} className="flex justify-between items-center p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                <span className="text-base font-bold text-gray-300">{srv.name}</span>
                <span className={`px-4.5 py-1.5 rounded-full text-xs font-bold border capitalize ${getStatusColor(val)}`}>
                  {val === "checking" ? "Checking..." : val}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 flex justify-between text-xs text-gray-500 font-medium">
          <span>Response latency: <span className="font-bold text-purple-400">{ping !== null ? `${ping}ms` : "N/A"}</span></span>
          <span>Checked: {status.systemTime ? new Date(status.systemTime).toLocaleTimeString() : "Just now"}</span>
        </div>
      </div>
    </div>
  );
}
