import { live_logs } from "../../components/logs/live_logs";
import { gpu_chart } from "../../components/charts/gpu_chart";
import { live_status } from "../../components/dashboard/live_status";
import { system_cards } from "../../components/system/system_cards";
import { ErrorBoundary } from "../../components/error_boundary";

export function dashboard_page(){

return(

<div className="mx-auto max-w-[1680px] space-y-6">

<ErrorBoundary>
  {live_status()}
</ErrorBoundary>

<ErrorBoundary>
  {system_cards()}
</ErrorBoundary>

<div
className="grid gap-6 xl:grid-cols-2"
style={{
gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)"
}}
>
<ErrorBoundary>
  {gpu_chart()}
</ErrorBoundary>
<ErrorBoundary>
  {live_logs()}
</ErrorBoundary>
</div>

</div>

);

}
