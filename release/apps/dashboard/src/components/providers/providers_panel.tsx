import {useEffect,useState} from "react";

export function providers_panel(){

const [providers,setProviders]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,2000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/providers"
);

setProviders(await r.json());

}catch{}

}

async function activate(name:string){

await fetch(
`http://127.0.0.1:8100/providers/${name}/activate`,
{
method:"POST"
}
);

load();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">

Providers

</div>

<div className="space-y-4">

{providers.map((provider:any)=>(

<div

key={provider.name}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{provider.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{provider.type}

</div>

</div>

<div className="flex items-center gap-4">

<div
className={
provider.active
?"text-emerald-400"
:"text-gray-500"
}
>

{provider.active?"Active":"Idle"}

</div>

<button

onClick={()=>activate(provider.name)}

disabled={provider.active}

className="rounded-xl bg-violet-600 px-4 py-2 disabled:bg-emerald-700"

>

{provider.active?"Loaded":"Activate"}

</button>

</div>

</div>

</div>

))}

</div>

</div>

);

}
