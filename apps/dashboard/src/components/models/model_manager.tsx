import {useEffect,useState} from "react";

export function model_manager(){

const [models,setModels]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,3000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/models"
);

setModels(await r.json());

}catch{}

}

async function activate(name:string){

await fetch(
`http://127.0.0.1:8100/model/${name}`,
{
method:"POST"
}
);

load();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">

Model Manager

</div>

<div className="space-y-4">

{models.map((model:any)=>(

<div

key={model.name}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{model.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{model.provider}

</div>

<div className="mt-1 text-xs text-gray-500 break-all">

{model.path}

</div>

</div>

<div className="flex items-center gap-4">

<div
className={
model.exists
?"text-emerald-400"
:"text-red-400"
}
>

{model.exists?"Installed":"Missing"}

</div>

<button

onClick={()=>activate(model.name)}

className="rounded-xl bg-violet-600 px-4 py-2"

>

Load

</button>

</div>

</div>

</div>

))}

</div>

</div>

);

}
