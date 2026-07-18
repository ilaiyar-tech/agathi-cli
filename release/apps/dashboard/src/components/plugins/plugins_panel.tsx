import {useEffect,useState} from "react";

export function plugins_panel(){

const [plugins,setPlugins]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,3000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/plugins"
);

setPlugins(await r.json());

}catch{}

}

async function toggle(name:string){

await fetch(
`http://127.0.0.1:8100/plugins/${name}/toggle`,
{
method:"POST"
}
);

load();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">

Plugins

</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-5">

{plugins.map((plugin:any)=>(

<div

key={plugin.name}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{plugin.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{plugin.description}

</div>

</div>

<div
className={
plugin.enabled
?"text-emerald-400"
:"text-gray-500"
}
>

{plugin.enabled?"Enabled":"Disabled"}

</div>

</div>

<div className="mt-5">

<button

onClick={()=>toggle(plugin.name)}

className="rounded-xl bg-violet-600 px-5 py-2"

>

{plugin.enabled?"Disable":"Enable"}

</button>

</div>

</div>

))}

</div>

</div>

);

}
