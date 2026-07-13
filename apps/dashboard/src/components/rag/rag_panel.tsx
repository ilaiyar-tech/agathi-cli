import {useEffect,useState} from "react";

export function rag_panel(){

const [status,setStatus]=useState<any>({});

useEffect(()=>{

refresh();

const timer=setInterval(refresh,3000);

return()=>clearInterval(timer);

},[]);

async function refresh(){

try{

const r=await fetch(
"http://127.0.0.1:8100/rag/status"
);

setStatus(await r.json());

}catch{}

}

async function rebuild(){

await fetch(
"http://127.0.0.1:8100/rag/rebuild",
{
method:"POST"
});

refresh();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
RAG Engine
</div>

<button

onClick={rebuild}

className="rounded-xl bg-violet-600 px-5 py-2"

>

Rebuild Index

</button>

</div>

<div className="space-y-4">

<div className="flex justify-between">

<span>Documents</span>

<span>{status.documents ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Chunks</span>

<span>{status.chunks ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Embedding</span>

<span>{status.embedding ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Reranker</span>

<span>{status.reranker ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Status</span>

<span>{status.status ?? "--"}</span>

</div>

</div>

</div>

);

}
