import { Outlet } from "react-router-dom";

import { sidebar } from "../components/sidebar/sidebar";
import { header } from "../components/header/header";

export function main_layout(){

return(

<div className="flex h-screen bg-[#05070c]">

{sidebar()}

<div className="flex min-w-0 flex-1 flex-col">

{header()}

<div className="flex-1 overflow-auto p-8">

<Outlet/>

</div>

</div>

</div>

);

}
