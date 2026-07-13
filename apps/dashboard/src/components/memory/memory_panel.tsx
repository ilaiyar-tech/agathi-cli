import {useEffect,useState} from "react";

export function memory_panel(){

const [items,setItems]=useState<any[]>([]);

useEffect(()=>{

load();

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/memory"
);

const d=await r.json();

setItems(d);

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Memory
</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{items.map((item,index)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-4"

>

<div className="text-xs text-violet-400">

{item.type ?? "memory"}

</div>

<div className="mt-2 whitespace-pre-wrap">

{item.content ?? JSON.stringify(item)}

</div>

</div>

))}

</div>

</div>

);

}
