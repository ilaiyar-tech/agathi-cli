import {useEffect,useState} from "react";

export function tasks_panel(){

const [tasks,setTasks]=useState<any[]>([]);

useEffect(()=>{

load();

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/tasks"
);

const d=await r.json();

setTasks(d);

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Tasks
</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{tasks.map((task:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{task.title}

</div>

<div className="mt-2 text-xs text-gray-400">

{task.description}

</div>

</div>

<div>

<span
className={
task.status==="completed"
?"text-emerald-400"
:task.status==="running"
?"text-cyan-400"
:"text-gray-400"
}
>

{task.status}

</span>

</div>

</div>

</div>

))}

</div>

</div>

);

}
