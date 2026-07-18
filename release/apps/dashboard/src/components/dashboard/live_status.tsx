import { use_dashboard } from "../../hooks/use_dashboard";
import { 
  MdMemory, 
  MdQueue, 
  MdTaskAlt, 
  MdLayers
} from "react-icons/md";

export function live_status() {
  const {
    system,
    active_model,
    active_provider,
    models,
    downloads,
    jobs,
    queue
  } = use_dashboard();

  const gpu = system.data?.gpu;
  const cpu = system.data?.cpu;
  const ram = system.data?.memory;

  if (system.isLoading || active_model.isLoading || active_provider.isLoading || models.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel p-6 h-40 animate-pulse bg-white/[0.01]" />
        ))}
      </div>
    );
  }

  const activeDownloads = Array.isArray(downloads.data) ? downloads.data : [];
  const activeJobs = Array.isArray(jobs.data) ? jobs.data : [];
  const queuedItems = Array.isArray(queue.data) ? queue.data : [];

  return (
    <div className="space-y-6">
      {/* Primary Hardware & AI engine metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Core telemetry */}
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-transparent opacity-30" />
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-400">
            Hardware Telemetry
          </div>
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">GPU Core utilization</span>
              <span className="font-mono font-semibold text-white">{gpu?.utilization ?? 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">CPU Load (Average)</span>
              <span className="font-mono font-semibold text-white">{cpu?.load?.[0] ?? "0.00"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">System RAM Free</span>
              <span className="font-mono font-semibold text-white">
                {ram?.free ? `${Math.round(ram.free / 1024 / 1024 / 1024)} GB` : "--"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">GPU Temperature</span>
              <span className="font-mono font-semibold text-white">{gpu?.temperature ?? 0}°C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">GPU Power Draw</span>
              <span className="font-mono font-semibold text-white">{gpu?.power ?? 0} W</span>
            </div>
          </div>
        </div>

        {/* Model Inference status */}
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 to-transparent opacity-30" />
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-cyan-400">
            Inference engine
          </div>
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Active Provider</span>
              <span className="font-semibold text-white capitalize">{active_provider.data?.active ?? "None"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Active Model</span>
              <span className="font-mono text-xs font-semibold text-white truncate max-w-[180px]" title={active_model.data?.active}>
                {active_model.data?.active ?? "Unloaded"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Registered Models</span>
              <span className="font-mono font-semibold text-white">{models.data?.length ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">WebSocket connection</span>
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            </div>
          </div>
        </div>

        {/* VRAM allocation progress */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              VRAM utilization
            </div>
            <div className="text-3xl font-bold tracking-tight text-white mb-4">
              {gpu?.memory_used ?? 0} <span className="text-sm font-normal text-gray-500">/ {gpu?.memory_total ?? 0} MB</span>
            </div>
          </div>
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((gpu?.memory_used ?? 0) / (gpu?.memory_total ?? 1)) * 100))}%`
                }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span>{Math.round(((gpu?.memory_used ?? 0) / (gpu?.memory_total ?? 1)) * 100)}% Used</span>
              <span>Available: {(gpu?.memory_total ?? 0) - (gpu?.memory_used ?? 0)} MB</span>
            </div>
          </div>
        </div>

      </div>

      {/* Secondary Subsystem Status Badges */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-black/20 p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <MdQueue size={18} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Queue State</div>
            <div className="text-sm font-semibold text-white">
              {queuedItems.length} tasks queued
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/20 p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <MdMemory size={18} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Downloads</div>
            <div className="text-sm font-semibold text-white">
              {activeDownloads.length} active
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/20 p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <MdTaskAlt size={18} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Execution</div>
            <div className="text-sm font-semibold text-white">
              {activeJobs.length} active tasks
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/20 p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <MdLayers size={18} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Subsystems</div>
            <div className="text-sm font-semibold text-white">
              28 active nodes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
