import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MdRefresh } from "react-icons/md";

export function knowledge_panel(){

const qc = useQueryClient();

const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8100";

const { data: documents = [], isLoading } = useQuery({
  queryKey: ["knowledge"],
  queryFn: async () => {
    const res = await fetch(`${apiUrl}/knowledge`);
    if (!res.ok) throw new Error("Failed to fetch knowledge");
    return res.json();
  }
});

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Knowledge Base
</div>

<button

onClick={() => qc.invalidateQueries({queryKey: ["knowledge"]})}

className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 transition flex items-center gap-2"
title="Refresh"
>
<MdRefresh size={18} />
Refresh
</button>

</div>

<div className="space-y-4">

{isLoading && <div className="text-gray-400 text-sm">Loading documents...</div>}

{documents.length === 0 && !isLoading && (
  <div className="text-gray-400 text-sm italic">No documents found. Sync directory to populate knowledge base.</div>
)}

{documents.map((doc:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-5 hover:border-violet-500/30 transition"

>

<div className="font-semibold text-lg">

{doc.title ?? doc.name ?? "Untitled"}

</div>

<div className="mt-2 text-xs text-gray-400 break-all bg-black/30 p-2 rounded-lg border border-white/5">

{doc.path}

</div>

<div className="mt-4 flex items-center justify-between">

<div className="text-xs font-medium text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">

{doc.chunks ?? 0} chunks

</div>

</div>

</div>

))}

</div>

</div>

);

}
