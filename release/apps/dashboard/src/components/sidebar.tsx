import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";
import {
RiDashboardFill,
RiChat3Fill,
RiCpuFill,
RiRobot2Fill,
RiImage2Fill,
RiFolder3Fill,
RiTerminalBoxFill,
RiBarChartBoxFill,
RiSettings4Fill
} from "react-icons/ri";

const items:[string,string,ComponentType<{size?:number}>][]=[
["/","Dashboard",RiDashboardFill],
["/chat","Chat",RiChat3Fill],
["/models","Models",RiCpuFill],
["/agents","Agents",RiRobot2Fill],
["/vision","Vision",RiImage2Fill],
["/files","Files",RiFolder3Fill],
["/terminal","Terminal",RiTerminalBoxFill],
["/builder","Builder",RiTerminalBoxFill],
["/benchmarks","Benchmarks",RiBarChartBoxFill],
["/settings","Settings",RiSettings4Fill],
];

export default function Sidebar(){

return(
<div
style={{
display:"flex",
flexDirection:"column",
gap:10,
marginTop:30
}}
>

{items.map(([to,title,Icon])=>(

<NavLink
key={to}
to={to}
style={({isActive})=>({

display:"flex",
alignItems:"center",
gap:14,

padding:"14px 16px",

borderRadius:14,

textDecoration:"none",

color:isActive
?"white"
:"var(--text_muted)",

background:isActive
?"linear-gradient(135deg,rgba(139,92,246,.18),rgba(6,182,212,.05))"
:"transparent",

border:isActive
?"1px solid rgba(139,92,246,.35)"
:"1px solid transparent"

})}
>

<Icon size={21}/>

<span>{title}</span>

</NavLink>

))}

</div>
);

}
