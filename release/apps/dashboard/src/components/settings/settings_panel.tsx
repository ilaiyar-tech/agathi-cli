import {use_dashboard} from "../../hooks/use_dashboard";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {getSettings, updateSettings} from "../../services/api";

export function settings_panel(){

const qc = useQueryClient();

const{
system,
active_model,
active_provider
}=use_dashboard();

const { data: settings } = useQuery({
  queryKey: ["settings"],
  queryFn: () => getSettings().then(r => r.data)
});

const updateSettingsMutation = useMutation({
  mutationFn: (newSettings: any) => updateSettings(newSettings),
  onSuccess: () => {
    qc.invalidateQueries({queryKey: ["settings"]});
  }
});

const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8100";

return(

<div className="space-y-6">

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">
General Settings
</div>

<div className="space-y-5">
  <div className="flex items-center justify-between">
    <div>
      <div className="font-medium">Streaming</div>
      <div className="text-xs text-gray-400">Enable real-time response streaming</div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        className="sr-only peer"
        checked={settings?.streaming ?? true}
        onChange={(e) => updateSettingsMutation.mutate({ streaming: e.target.checked })}
      />
      <div className="w-11 h-6 bg-black/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 border border-white/10"></div>
    </label>
  </div>

  <div className="flex flex-col gap-2">
    <div>
      <div className="font-medium">Temperature</div>
      <div className="text-xs text-gray-400">Controls randomness in the model's responses</div>
    </div>
    <div className="flex items-center gap-4">
      <input 
        type="range" 
        min="0" max="2" step="0.1"
        value={settings?.temperature ?? 0.7}
        onChange={(e) => updateSettingsMutation.mutate({ temperature: parseFloat(e.target.value) })}
        className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-violet-500"
      />
      <span className="text-sm font-medium w-8 text-right">{settings?.temperature ?? 0.7}</span>
    </div>
  </div>
</div>

</div>

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">
Runtime
</div>

<div className="space-y-5">

<div className="flex justify-between">

<span className="text-gray-400">
Backend
</span>

<span>
{apiUrl}
</span>

</div>

<div className="flex justify-between">

<span className="text-gray-400">
Provider
</span>

<span>
{active_provider.data?.active || "--"}
</span>

</div>

<div className="flex justify-between">

<span className="text-gray-400">
Model
</span>

<span>
{active_model.data?.active || "--"}
</span>

</div>

<div className="flex justify-between">

<span className="text-gray-400">
GPU
</span>

<span>
{system.data?.gpu?.utilization ?? 0}%
</span>

</div>

<div className="flex justify-between">

<span className="text-gray-400">
VRAM
</span>

<span>
{system.data?.gpu?.memory_used ?? 0}/{system.data?.gpu?.memory_total ?? 0}
</span>

</div>

</div>

</div>

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">
Actions
</div>

<div className="grid gap-4">

<button
className="rounded-2xl border border-white/5 p-4 hover:border-violet-500 transition"
onClick={()=>location.reload()}
>
Refresh Dashboard
</button>

<button
className="rounded-2xl border border-white/5 p-4 hover:border-violet-500 transition"
onClick={()=>window.open(`${apiUrl}/system`)}
>
Open System API
</button>

<button
className="rounded-2xl border border-white/5 p-4 hover:border-violet-500 transition"
onClick={()=>window.open(`${apiUrl}/models`)}
>
Open Models API
</button>

</div>

</div>

</div>

);

}
