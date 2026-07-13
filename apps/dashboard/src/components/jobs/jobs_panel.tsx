import {useEffect,useState} from "react";

export function jobs_panel(){

const [jobs,setJobs]=useState<any[]>([]);

useEffect(()=>{

load();

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/jobs"
);

const d=await r.json();

setJobs(d);

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Jobs
</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{jobs.map((job:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{job.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{job.description}

</div>

</div>

<div className="text-right">

<div
className={
job.status==="running"
?"text-cyan-400"
:job.status==="completed"
?"text-emerald-400"
:job.status==="failed"
?"text-red-400"
:"text-gray-400"
}
>

{job.status}

</div>

<div className="mt-2 text-xs text-gray-500">

{job.progress ?? 0}%

</div>

</div>

</div>

</div>

))}

</div>

</div>

);

}
