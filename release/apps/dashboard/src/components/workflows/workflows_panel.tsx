import {useEffect,useState} from "react";

export function workflows_panel(){

const [workflows,setWorkflows]=useState<any[]>([]);

useEffect(()=>{

load();

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/workflows"
);

const d=await r.json();

setWorkflows(d);

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Workflows
</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{workflows.map((workflow:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{workflow.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{workflow.description}

</div>

</div>

<div>

<span
className={
workflow.status==="running"
?"text-emerald-400"
:"text-gray-400"
}
>

{workflow.status}

</span>

</div>

</div>

</div>

))}

</div>

</div>

);

}
