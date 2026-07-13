import {useEffect,useState} from "react";

export function audit_panel(){

const [logs,setLogs]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,3000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/audit"
);

setLogs(await r.json());

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">

Audit Logs

</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-3">

{logs.map((log:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-4"

>

<div className="flex justify-between">

<div>

{log.action}

</div>

<div className="text-xs text-gray-500">

{log.time}

</div>

</div>

<div className="mt-2 text-xs text-gray-400">

{log.user}

</div>

</div>

))}

</div>

</div>

);

}
