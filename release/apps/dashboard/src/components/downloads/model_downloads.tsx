import { use_dashboard } from "../../hooks/use_dashboard";

export function model_downloads() {
  const { downloads } = use_dashboard();

  async function cancel(id: string) {
    try {
      await fetch(`http://127.0.0.1:8100/downloads/${id}/cancel`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to cancel download:", err);
    }
  }

  const list = Array.isArray(downloads.data) ? downloads.data : [];

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="text-xl font-semibold">Downloads</div>
        <div className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" title="Connected to download streams" />
      </div>

      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="rounded-xl border border-white/5 p-6 text-center text-gray-500 italic">
            No active downloads
          </div>
        ) : (
          list.map((download: any) => (
            <div
              key={download.id}
              className="rounded-2xl border border-white/5 bg-black/20 p-5 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{download.model}</div>
                  <div className="mt-2 text-xs text-gray-400">
                    Speed: {download.speed || "0 KB/s"} · ETA: {download.eta || "unknown"}
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="font-mono text-sm font-medium text-cyan-400">
                    {download.progress}%
                  </div>

                  <button
                    onClick={() => cancel(download.id)}
                    className="rounded-xl bg-red-650/80 hover:bg-red-600 px-4 py-2 text-sm text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  style={{
                    width: `${download.progress}%`,
                  }}
                  className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
