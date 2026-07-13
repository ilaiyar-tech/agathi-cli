import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { use_dashboard } from "../../hooks/use_dashboard";
import * as backend from "../../services/api";

export function chat_inspector(){

const {
active_model,
active_provider
}=use_dashboard();

const queryClient = useQueryClient();

const { data: settings } = useQuery({
  queryKey: ["settings"],
  queryFn: () => backend.getSettings().then(r => r.data)
});

const { data: models } = useQuery({
  queryKey: ["models"],
  queryFn: () => backend.models().then(r => r.data)
});

const setModelMutation = useMutation({
  mutationFn: (name: string) => backend.loadModel(name),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["active-model"] });
  }
});

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl">

<div className="border-b border-white/5 p-5 font-semibold">
Inspector
</div>

<div className="space-y-4 p-5">

<div>
<div className="text-xs text-gray-500 mb-1">
Model
</div>
<select
  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-violet-500 transition"
  value={active_model.data?.active || ""}
  onChange={(e) => setModelMutation.mutate(e.target.value)}
>
  <option value="">Select a model...</option>
  {Array.isArray(models) && models.map((m: any) => (
    <option key={m.name} value={m.name}>{m.name} ({m.type})</option>
  ))}
</select>
</div>

<div>
<div className="text-xs text-gray-500 mb-1">
Provider
</div>
<select
  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-violet-500 transition"
  value={active_provider.data?.active || ""}
  disabled
>
  <option value={active_provider.data?.active || ""}>{active_provider.data?.active || "--"}</option>
</select>
</div>

<div>
<div className="text-xs text-gray-500">
Streaming
</div>

<div>
{settings?.streaming ? "Enabled" : "Disabled"}
</div>
</div>

<div>
<div className="text-xs text-gray-500">
Temperature
</div>

<div>
{settings?.temperature ?? 0.7}
</div>
</div>

</div>

</div>

);

}
