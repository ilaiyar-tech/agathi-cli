import {useEffect,useState} from "react";

export function server_manager(){

const [servers,setServers]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,2000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/servers"
);

setServers(await r.json());

}catch{}

}

async function start(name:string){

await fetch(
`http://127.0.0.1:8100/server/${name}/start`,
{
method:"POST"
}
);

load();

}

async function stop(name:string){

await fetch(
`http://127.0.0.1:8100/server/${name}/stop`,
{
method:"POST"
}
);

load();

}

async function restart(name:string){

await fetch(
`http://127.0.0.1:8100/server/${name}/restart`,
{
method:"POST"
}
);

load();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">

Servers

</div>

<div className="space-y-5">

{servers.map((server:any)=>(

<div

key={server.name}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{server.name}

</div>

<div className="mt-2 text-xs text-gray-400">

Port {server.port}

</div>

</div>

<div
className={
server.running
?"text-emerald-400"
:"text-red-400"
}
>

{server.running?"Running":"Stopped"}

</div>

</div>

<div className="mt-5 flex gap-3">

<button

onClick={()=>start(server.name)}

className="rounded-xl bg-emerald-600 px-4 py-2"

>

Start

</button>

<button

onClick={()=>restart(server.name)}

className="rounded-xl bg-cyan-600 px-4 py-2"

>

Restart

</button>

<button

onClick={()=>stop(server.name)}

className="rounded-xl bg-red-600 px-4 py-2"

>

Stop

</button>

</div>

</div>

))}

</div>

</div>

);

}
