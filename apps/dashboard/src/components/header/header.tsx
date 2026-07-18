import { use_dashboard } from "../../hooks/use_dashboard";

export function header(){

const {
system,
active_model,
active_provider
}=use_dashboard();

const gpu=system.data?.gpu;
const ram=system.data?.memory;

return(

<header
className="flex min-h-[84px] flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-black/30 px-5 py-4 backdrop-blur-xl sm:px-8"
>

<div>

<div className="text-2xl font-semibold">
tu2pu AI
</div>

<div className="text-sm text-gray-400">
Fastify :8100
</div>

</div>

<div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-xs text-gray-300 sm:text-sm">

<div className="rounded-lg border border-white/5 bg-white/[.03] px-3 py-2">
GPU {gpu?.utilization ?? "--"}%
</div>

<div className="rounded-lg border border-white/5 bg-white/[.03] px-3 py-2">
VRAM {gpu?.memory_used ?? "--"} / {gpu?.memory_total ?? "--"} MB
</div>

<div className="rounded-lg border border-white/5 bg-white/[.03] px-3 py-2">
RAM {Math.round((ram?.free ?? 0)/1024/1024/1024)} GB FREE
</div>

<div className="hidden rounded-lg border border-white/5 bg-white/[.03] px-3 py-2 lg:block">
MODEL {active_model.data?.active ?? "--"}
</div>

<div className="hidden rounded-lg border border-white/5 bg-white/[.03] px-3 py-2 lg:block">
PROVIDER {active_provider.data?.active ?? "--"}
</div>

</div>

</header>

);

}
