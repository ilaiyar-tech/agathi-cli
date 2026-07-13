import {useEffect,useState} from "react";

export function admin_panel(){

const [health,setHealth]=useState<any>({});
const [version,setVersion]=useState<any>({});
const [config,setConfig]=useState<any>({});

useEffect(()=>{

refresh();

},[]);

async function refresh(){

try{

const [h,v,c]=await Promise.all([

fetch("http://127.0.0.1:8100/health").then(r=>r.json()),

fetch("http://127.0.0.1:8100/version").then(r=>r.json()),

fetch("http://127.0.0.1:8100/config").then(r=>r.json())

]);

setHealth(h);
setVersion(v);
setConfig(c);

}catch{}

}

return(

<div className="space-y-6">

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Admin
</div>

<button
onClick={refresh}
className="rounded-xl border border-white/5 px-4 py-2"
>

Refresh

</button>

</div>

<div className="space-y-4">

<div className="flex justify-between">

<span>Health</span>

<span>{health.status ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Version</span>

<span>{version.version ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Environment</span>

<span>{config.environment ?? "--"}</span>

</div>

<div className="flex justify-between">

<span>Port</span>

<span>{config.port ?? "--"}</span>

</div>

</div>

</div>

</div>

);

}
