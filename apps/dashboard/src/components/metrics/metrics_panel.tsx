import {useEffect,useState} from "react";

export function metrics_panel(){

const [metrics,setMetrics]=useState<any>(null);

useEffect(()=>{

load();

const timer=setInterval(load,1000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/metrics"
);

const d=await r.json();

setMetrics(d);

}catch{}

}

return(

<div className="grid gap-6 lg:grid-cols-4">

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="text-xs text-gray-400">
REQUESTS
</div>

<div className="mt-3 text-4xl font-bold">
{metrics?.requests ?? 0}
</div>

</div>

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="text-xs text-gray-400">
TOKENS
</div>

<div className="mt-3 text-4xl font-bold">
{metrics?.tokens ?? 0}
</div>

</div>

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="text-xs text-gray-400">
LATENCY
</div>

<div className="mt-3 text-4xl font-bold">
{metrics?.latency ?? 0} ms
</div>

</div>

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="text-xs text-gray-400">
UPTIME
</div>

<div className="mt-3 text-4xl font-bold">
{metrics?.uptime ?? "--"}
</div>

</div>

</div>

);

}
