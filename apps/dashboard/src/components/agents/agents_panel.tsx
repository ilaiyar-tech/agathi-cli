import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MdRefresh, MdPlayArrow, MdStop } from "react-icons/md";

export function agents_panel(){

const qc = useQueryClient();
const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8100";

const { data: agents = [], isLoading } = useQuery({
  queryKey: ["agents"],
  queryFn: async () => {
    const res = await fetch(`${apiUrl}/agents`);
    if (!res.ok) throw new Error("Failed to fetch agents");
    return res.json();
  }
});

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Agents
</div>

<button

onClick={() => qc.invalidateQueries({queryKey: ["agents"]})}

className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 transition flex items-center gap-2"
title="Refresh"
>
<MdRefresh size={18} />
Refresh
</button>

</div>

<div className="grid gap-4">

{isLoading && <div className="text-gray-400 text-sm">Loading agents...</div>}

{agents.length === 0 && !isLoading && (
  <div className="text-gray-400 text-sm italic">No active agents discovered.</div>
)}

{agents.map((agent:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-5 hover:border-violet-500/30 transition group"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold capitalize text-lg">

{agent.name}

</div>

<div className="mt-1 text-xs text-gray-400 bg-black/30 px-2 py-1 rounded-md inline-block">

{agent.description}

</div>

</div>

<div className="flex items-center gap-3">

<span
className={
agent.running
?"text-emerald-400 text-sm font-medium"
:"text-red-400 text-sm font-medium"
}
>

{agent.running?"Running":"Stopped"}

</span>

<button 
  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
  title={agent.running ? "Stop Agent" : "Start Agent"}
>
  {agent.running ? <MdStop size={18} className="text-red-400" /> : <MdPlayArrow size={18} className="text-emerald-400" />}
</button>

</div>

</div>

</div>

))}

</div>

</div>

);

}
