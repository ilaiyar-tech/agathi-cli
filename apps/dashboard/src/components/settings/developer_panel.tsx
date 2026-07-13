import {useState} from "react";

export function developer_panel(){

const [busy,setBusy]=useState(false);

async function restart(){

setBusy(true);

await fetch(
"http://127.0.0.1:8100/admin/restart",
{
method:"POST"
}
);

setBusy(false);

}

async function shutdown(){

setBusy(true);

await fetch(
"http://127.0.0.1:8100/admin/shutdown",
{
method:"POST"
}
);

setBusy(false);

}

async function clearCache(){

setBusy(true);

await fetch(
"http://127.0.0.1:8100/admin/cache/clear",
{
method:"POST"
}
);

setBusy(false);

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">

Developer

</div>

<div className="grid gap-4">

<button

onClick={restart}

disabled={busy}

className="rounded-2xl bg-violet-600 p-4"

>

Restart Backend

</button>

<button

onClick={clearCache}

disabled={busy}

className="rounded-2xl bg-cyan-600 p-4"

>

Clear Cache

</button>

<button

onClick={shutdown}

disabled={busy}

className="rounded-2xl bg-red-600 p-4"

>

Shutdown

</button>

</div>

</div>

);

}
