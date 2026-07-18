import {
RiCpuFill,
RiServerFill
} from "react-icons/ri";

export default function Header(){

const badge=(title:string,value:string)=>(
<div
style={{
display:"flex",
alignItems:"center",
gap:10,
padding:"10px 16px",
border:"1px solid var(--card_border)",
borderRadius:12,
background:"rgba(255,255,255,.03)"
}}
>
<div style={{color:"#06b6d4"}}>
<RiCpuFill/>
</div>

<div>
<div
style={{
fontSize:11,
color:"var(--text_muted)"
}}
>
{title}
</div>

<div
style={{
fontWeight:600
}}
>
{value}
</div>

</div>
</div>
);

return(

<header
style={{
height:80,
display:"flex",
alignItems:"center",
justifyContent:"space-between",
padding:"0 30px",
borderBottom:"1px solid var(--card_border)",
background:"rgba(5,7,12,.82)",
backdropFilter:"blur(18px)"
}}
>

<div>

<div
style={{
fontSize:28,
fontWeight:700
}}
>
tu2pu AI
</div>

<div
style={{
fontSize:13,
color:"var(--text_muted)"
}}
>
Local AI Operating System
</div>

</div>

<div
style={{
display:"flex",
gap:14
}}
>

{badge("GPU","--")}
{badge("VRAM","--")}
{badge("RAM","--")}

<div
style={{
display:"flex",
alignItems:"center",
gap:10,
padding:"10px 18px",
borderRadius:12,
background:"rgba(16,185,129,.08)",
border:"1px solid rgba(16,185,129,.25)",
color:"#34d399"
}}
>
<RiServerFill/>
ONLINE
</div>

</div>

</header>

);

}
