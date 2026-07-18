import { use_dashboard } from "../../hooks/use_dashboard";

export function system_cards(){

const {system,models}=use_dashboard();

const gpu=system.data?.gpu;
const cpu=system.data?.cpu;
const ram=system.data?.memory;

const cards=[
{
title:"GPU",
value:`${gpu?.utilization ?? "--"} %`
},
{
title:"VRAM",
value:`${gpu?.memory_used ?? "--"} / ${gpu?.memory_total ?? "--"} MB`
},
{
title:"CPU",
value:`${cpu?.load?.[0] ?? "--"}`
},
{
title:"RAM FREE",
value:`${Math.round((ram?.free ?? 0)/1024/1024/1024)} GB`
},
{
title:"MODELS",
value:`${models.data?.length ?? "--"}`
},
{
title:"GPU TEMP",
value:`${gpu?.temperature ?? "--"} °C`
}
];

return(

<div
className="grid gap-6"
style={{
gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"
}}
>

{cards.map(card=>(

<div
key={card.title}
className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl"
>

<div className="mb-4 text-xs uppercase tracking-widest text-gray-400">
{card.title}
</div>

<div className="text-3xl font-semibold">
{card.value}
</div>

</div>

))}

</div>

);

}
