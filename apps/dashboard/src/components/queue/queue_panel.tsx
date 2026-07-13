import {useEffect,useState} from "react";

export function queue_panel(){

const [queue,setQueue]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,2000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/queue"
);

const d=await r.json();

setQueue(d);

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Queue
</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{queue.map((item:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{item.id}

</div>

<div className="mt-2 text-xs text-gray-400">

{item.model}

</div>

</div>

<div className="text-right">

<div
className={
item.status==="running"
?"text-cyan-400"
:item.status==="completed"
?"text-emerald-400"
:item.status==="failed"
?"text-red-400"
:"text-gray-400"
}
>

{item.status}

</div>

<div className="mt-2 text-xs text-gray-500">

{item.progress ?? 0}%

</div>

</div>

</div>

</div>

))}

</div>

</div>

);

}
