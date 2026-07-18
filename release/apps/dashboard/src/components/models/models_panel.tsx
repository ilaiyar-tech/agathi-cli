import { useState } from "react";
import { use_dashboard } from "../../hooks/use_dashboard";
import { loadModel, startDownload, cancelDownload, getDownloads, deleteModel } from "../../services/api";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { MdCancel, MdDelete } from "react-icons/md";

export function models_panel(){

const qc=useQueryClient();

const{
models,
active_model
}=use_dashboard();

const { data: downloads = [] } = useQuery({
  queryKey: ["downloads"],
  queryFn: () => getDownloads().then(r => r.data),
  refetchInterval: (query) => {
    const active = query.state.data?.some((d: any) => d.status === "downloading" || d.status === "queued");
    return active ? 1000 : false;
  }
});

const [newModelName, setNewModelName] = useState("");
const [newModelUrl, setNewModelUrl] = useState("");
const [showAdd, setShowAdd] = useState(false);

const startDownloadMutation = useMutation({
  mutationFn: () => startDownload({ model: newModelName, url: newModelUrl }),
  onSuccess: () => {
    setShowAdd(false);
    setNewModelName("");
    setNewModelUrl("");
    qc.invalidateQueries({queryKey:["downloads"]});
  }
});

async function activate(name:string){
  await loadModel(name);
  await Promise.all([
    qc.invalidateQueries({queryKey:["models"]}),
    qc.invalidateQueries({queryKey:["active-model"]}),
    qc.invalidateQueries({queryKey:["system"]}),
    qc.invalidateQueries({queryKey:["active-provider"]})
  ]);
}

async function cancelActiveDownload(id: string) {
  await cancelDownload(id);
  qc.invalidateQueries({queryKey:["downloads"]});
}

async function handleDelete(name: string) {
  if (confirm(`Are you sure you want to delete ${name}?`)) {
    await deleteModel(name);
    qc.invalidateQueries({queryKey:["models"]});
  }
}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">

<div className="mb-6 flex items-center justify-between">

<h2 className="text-xl font-semibold">
Installed Models
</h2>

<div className="flex items-center gap-3">
<button 
  onClick={() => setShowAdd(!showAdd)}
  className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 transition"
>
  Add Model
</button>
<div className="rounded-xl bg-violet-600/20 px-3 py-1 text-xs text-violet-300">
{active_model.data?.active}
</div>
</div>

</div>

{showAdd && (
  <div className="mb-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5 space-y-4">
    <div className="text-sm font-semibold text-violet-200">Download New Model</div>
    <div className="flex gap-4">
      <input 
        placeholder="Model Name (e.g. Llama-3-8B)"
        value={newModelName}
        onChange={e => setNewModelName(e.target.value)}
        className="flex-1 rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-sm outline-none focus:border-violet-500"
      />
      <input 
        placeholder="Download URL (e.g. HuggingFace GGUF link)"
        value={newModelUrl}
        onChange={e => setNewModelUrl(e.target.value)}
        className="flex-[2] rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-sm outline-none focus:border-violet-500"
      />
      <button 
        onClick={() => startDownloadMutation.mutate()}
        disabled={!newModelName.trim() || !newModelUrl.trim() || startDownloadMutation.isPending}
        className="rounded-lg bg-violet-600 px-6 py-2 text-sm disabled:opacity-50 hover:bg-violet-500 transition"
      >
        Download
      </button>
    </div>
  </div>
)}

{downloads.length > 0 && (
  <div className="mb-6 space-y-4">
    <div className="text-sm font-semibold text-gray-400">Downloads</div>
    {downloads.map((d: any) => (
      <div key={d.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium">{d.model}</div>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span>{d.status}</span>
            {(d.status === "downloading" || d.status === "queued") && (
              <button onClick={() => cancelActiveDownload(d.id)} className="text-red-400 hover:text-red-300 transition" title="Cancel">
                <MdCancel size={16} />
              </button>
            )}
          </div>
        </div>
        {d.status === "downloading" && (
          <div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
              <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${d.progress}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{d.progress}%</span>
              <span>{d.speed} • {d.eta}</span>
            </div>
          </div>
        )}
        {d.status === "failed" && (
          <div className="text-xs text-red-400 mt-1">{d.error}</div>
        )}
      </div>
    ))}
  </div>
)}

<div className="space-y-4">

{models.data?.map((model:any)=>(

<div
key={model.name}
className="rounded-2xl border border-white/5 bg-black/20 p-5"
>

<div className="flex items-start justify-between">

<div>

<div className="text-lg font-semibold">
{model.name}
</div>

<div className="mt-1 text-xs text-gray-400">
{model.provider}
</div>

<div className="mt-2 break-all text-xs text-gray-500">
{model.path}
</div>

</div>

<div className="text-right">

<div className="text-sm">
{(model.size/1024/1024/1024).toFixed(2)} GB
</div>

<div
className={
model.exists
?"mt-2 text-emerald-400"
:"mt-2 text-red-400"
}
>
{model.exists?"Installed":"Missing"}
</div>

</div>

</div>

<div className="mt-5 flex justify-end gap-3">

<button
  onClick={() => handleDelete(model.name)}
  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20 transition flex items-center justify-center"
  title="Delete Model"
>
  <MdDelete size={18} />
</button>

<button

disabled={
!model.exists ||
active_model.data?.active===model.name
}

onClick={()=>activate(model.name)}

className="rounded-xl bg-violet-600 px-5 py-2 disabled:bg-emerald-700 hover:bg-violet-500 transition"

>

{
active_model.data?.active===model.name
?"Loaded"
:"Load"
}

</button>

</div>

</div>

))}

</div>

</div>

);

}
