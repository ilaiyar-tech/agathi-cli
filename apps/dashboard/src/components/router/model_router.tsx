import { use_dashboard } from "../../hooks/use_dashboard";
import { loadModel } from "../../services/api";
import { useQueryClient } from "@tanstack/react-query";

export function model_router(){

const qc=useQueryClient();

const {
active_model
}=use_dashboard();

const buttons=[

["chat","Qwen Chat"],

["planner","Gemma Planner"],

["coder_fast","Coder Fast"],

["coder_pro","Coder Pro"],

["reasoner","Reasoner"],

["vision","Vision"]

];

async function change(name:string){

await loadModel(name);

await qc.invalidateQueries();

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">
Quick Router
</div>

<div className="grid grid-cols-2 gap-4">

{buttons.map(button=>(

<button

key={button[0]}

onClick={()=>change(button[0])}

className={
active_model.data?.active===button[0]
?"rounded-2xl bg-violet-600 p-4 text-left"
:"rounded-2xl border border-white/5 bg-black/20 p-4 text-left hover:border-violet-500"
}

>

<div className="font-semibold">
{button[1]}
</div>

<div className="mt-2 text-xs opacity-70">
{button[0]}
</div>

</button>

))}

</div>

</div>

);

}
