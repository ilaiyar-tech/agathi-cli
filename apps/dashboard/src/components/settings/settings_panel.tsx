import { useState } from "react";
import {use_dashboard} from "../../hooks/use_dashboard";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {getSettings, updateSettings, getWhatsappStatus, linkWhatsapp, unlinkWhatsapp, testWhatsapp} from "../../services/api";

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

const { data: whatsappStatus, refetch: refetchWhatsapp } = useQuery({
  queryKey: ["whatsapp-status"],
  queryFn: () => getWhatsappStatus().then(r => r.data),
  refetchInterval: (query) => {
    return query.state.data?.status === "Connecting" ? 1000 : false;
  }
});

const [qrCode, setQrCode] = useState<string | null>(null);

const startLinkingMutation = useMutation({
  mutationFn: () => linkWhatsapp(),
  onSuccess: (res) => {
    setQrCode(res.data.qrCode);
    refetchWhatsapp();
  }
});

const unlinkMutation = useMutation({
  mutationFn: () => unlinkWhatsapp(),
  onSuccess: () => {
    setQrCode(null);
    refetchWhatsapp();
  }
});

const testMutation = useMutation({
  mutationFn: () => testWhatsapp(),
  onSuccess: () => {
    alert("Test alert sent to WhatsApp! Check console/terminal logs.");
  }
});

function cancelLinking() {
  unlinkMutation.mutate();
}

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
  <div className="mb-6 flex items-center justify-between">
    <div>
      <div className="text-xl font-semibold">WhatsApp Integration</div>
      <div className="text-xs text-gray-400 mt-1">Receive admin alerts and notify task status on default Admin Number</div>
    </div>
    <div className="text-xs px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300">
      {whatsappStatus?.status || "Disconnected"}
    </div>
  </div>

  <div className="space-y-4">
    <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
      <div>
        <div className="font-semibold text-white">Admin Number</div>
        <div className="text-xs text-gray-400 mt-0.5">WHATSAPP_ADMIN_NUMBER configuration value</div>
      </div>
      <div className="font-mono text-sm text-gray-300">
        {whatsappStatus?.adminNumber || "+91 96989 21693"}
      </div>
    </div>

    {whatsappStatus?.status === "Disconnected" ? (
      <div className="space-y-4">
        {qrCode ? (
          <div className="flex flex-col items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
            <div className="text-sm font-medium text-gray-300">Scan QR Code with WhatsApp</div>
            <img src={qrCode} alt="WhatsApp Login QR" className="w-48 h-48 bg-white p-2 rounded-xl" />
            <button 
              onClick={cancelLinking}
              className="text-xs text-red-400 hover:text-red-300 transition underline"
            >
              Cancel Link
            </button>
          </div>
        ) : (
          <button 
            onClick={() => startLinkingMutation.mutate()}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-2xl font-semibold text-white transition"
          >
            Link WhatsApp
          </button>
        )}
      </div>
    ) : whatsappStatus?.status === "Connecting" ? (
      <div className="flex flex-col items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
        <div className="text-sm font-medium text-gray-300">Connecting... Please scan the QR code.</div>
        {qrCode && <img src={qrCode} alt="WhatsApp Login QR" className="w-48 h-48 bg-white p-2 rounded-xl" />}
        <button 
          onClick={cancelLinking}
          className="text-xs text-red-400 hover:text-red-300 transition underline"
        >
          Cancel Link
        </button>
      </div>
    ) : (
      <div className="space-y-3">
        <div className="flex gap-3">
          <button 
            onClick={() => testMutation.mutate()}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold border border-white/10 transition"
          >
            Send Test Notification
          </button>
          <button 
            onClick={() => unlinkMutation.mutate()}
            className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-2xl font-semibold border border-red-500/20 transition"
          >
            Unlink WhatsApp
          </button>
        </div>
      </div>
    )}
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
