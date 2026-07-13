import {useEffect,useState} from "react";

export function backups_panel(){

const [backups,setBackups]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,5000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/backups"
);

setBackups(await r.json());

}catch{}

}

async function createBackup(){

await fetch(
"http://127.0.0.1:8100/backups/create",
{
method:"POST"
}
);

load();

}

async function restore(id:string){

await fetch(
`http://127.0.0.1:8100/backups/${id}/restore`,
{
method:"POST"
}
);

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">

Backups

</div>

<button

onClick={createBackup}

className="rounded-xl bg-violet-600 px-5 py-2"

>

Create Backup

</button>

</div>

<div className="space-y-4">

{backups.map((backup:any)=>(

<div

key={backup.id}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{backup.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{backup.created_at}

</div>

</div>

<button

onClick={()=>restore(backup.id)}

className="rounded-xl bg-cyan-600 px-4 py-2"

>

Restore

</button>

</div>

</div>

))}

</div>

</div>

);

}
