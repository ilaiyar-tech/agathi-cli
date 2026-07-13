import {useEffect,useState} from "react";

export function files_panel(){

const [files,setFiles]=useState<any[]>([]);

useEffect(()=>{

load();

},[]);

async function load(){

try{

const r=await fetch(
"http://127.0.0.1:8100/files"
);

const d=await r.json();

setFiles(d);

}catch{}

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 flex items-center justify-between">

<div className="text-xl font-semibold">
Files
</div>

<button

onClick={load}

className="rounded-xl border border-white/5 px-4 py-2"

>

Refresh

</button>

</div>

<div className="space-y-4">

{files.map((file:any,index:number)=>(

<div

key={index}

className="rounded-2xl border border-white/5 bg-black/20 p-4"

>

<div className="font-semibold">

{file.name}

</div>

<div className="mt-2 break-all text-xs text-gray-400">

{file.path}

</div>

<div className="mt-2 flex gap-6 text-xs">

<div>

{file.size} bytes

</div>

<div>

{file.type}

</div>

</div>

</div>

))}

</div>

</div>

);

}
