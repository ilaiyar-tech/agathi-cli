const cards=[
["GPU","95%"],
["CPU","18%"],
["VRAM","6.9 / 8 GB"],
["RAM","11 / 32 GB"],
["MODELS","7"],
["ACTIVE","coder_pro"]
];

export default function Dashboard(){

return(

<div>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
gap:20
}}
>

{cards.map(([title,value])=>(

<div
key={title}
style={{
background:"rgba(13,18,30,.70)",
border:"1px solid rgba(255,255,255,.06)",
borderRadius:20,
padding:24
}}
>

<div
style={{
fontSize:12,
color:"var(--text_muted)",
marginBottom:14
}}
>
{title}
</div>

<div
style={{
fontSize:34,
fontWeight:700
}}
>
{value}
</div>

</div>

))}

</div>

<div
style={{
marginTop:30,
display:"grid",
gridTemplateColumns:"2fr 1fr",
gap:20
}}
>

<div
style={{
height:420,
borderRadius:20,
background:"rgba(13,18,30,.70)",
border:"1px solid rgba(255,255,255,.06)",
padding:24
}}
>
Live Activity
</div>

<div
style={{
display:"flex",
flexDirection:"column",
gap:20
}}
>

<div
style={{
height:200,
borderRadius:20,
background:"rgba(13,18,30,.70)",
border:"1px solid rgba(255,255,255,.06)",
padding:24
}}
>
Active Model
</div>

<div
style={{
height:200,
borderRadius:20,
background:"rgba(13,18,30,.70)",
border:"1px solid rgba(255,255,255,.06)",
padding:24
}}
>
Recent Chats
</div>

</div>

</div>

</div>

);

}
