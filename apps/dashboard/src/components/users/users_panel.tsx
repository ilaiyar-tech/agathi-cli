import {useEffect,useState} from "react";

export function users_panel(){

const [users,setUsers]=useState<any[]>([]);

useEffect(()=>{

load();

const timer=setInterval(load,5000);

return()=>clearInterval(timer);

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/users"
);

setUsers(await r.json());

}catch{}

}

async function disable(id:string){

await fetch(
`http://127.0.0.1:8100/users/${id}/disable`,
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

Users

</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{users.map((user:any)=>(

<div

key={user.id}

className="rounded-2xl border border-white/5 bg-black/20 p-5"

>

<div className="flex items-center justify-between">

<div>

<div className="font-semibold">

{user.name}

</div>

<div className="mt-2 text-xs text-gray-400">

{user.email}

</div>

</div>

<div className="flex items-center gap-4">

<div
className={
user.active
?"text-emerald-400"
:"text-red-400"
}
>

{user.active?"Active":"Disabled"}

</div>

<button

onClick={()=>disable(user.id)}

className="rounded-xl bg-red-600 px-4 py-2"

>

Disable

</button>

</div>

</div>

</div>

))}

</div>

</div>

);

}
