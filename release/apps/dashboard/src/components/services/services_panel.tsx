import {useEffect,useState} from "react";

export function services_panel(){

const [services,setServices]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,3000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/services"
);

setServices(await r.json());

}catch{}

}

async function action(name:string,cmd:string){

await fetch(
`http://127.0.0.1:8100/services/${name}/${cmd}`,
{
method:"POST"
}
);

load();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">

Services

</div>

<div className="space-y-5">

{services.map((service:any)=>(

<div

key={service.name}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{service.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{service.description}

</div>

</div>

<div
className={
service.running
?"text-emerald-400"
:"text-red-400"
}
>

{service.running?"Running":"Stopped"}

</div>

</div>

<div className="mt-5 flex gap-3">

<button

onClick={()=>action(service.name,"start")}

className="rounded-xl bg-emerald-600 px-4 py-2"

>

Start

</button>

<button

onClick={()=>action(service.name,"restart")}

className="rounded-xl bg-cyan-600 px-4 py-2"

>

Restart

</button>

<button

onClick={()=>action(service.name,"stop")}

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
