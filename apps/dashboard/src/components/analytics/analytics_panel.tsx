import {useEffect,useState} from "react";
import ReactECharts from "echarts-for-react";

export function analytics_panel(){

const [history,setHistory]=useState<number[]>([]);

useEffect(()=>{

const timer=setInterval(async()=>{

try{

const r=await fetch(
"http://127.0.0.1:8100/system"
);

const d=await r.json();

setHistory(prev=>{

const next=[
...prev,
d.gpu.utilization
];

if(next.length>60)
next.shift();

return next;

});

}catch{}

},1000);

return()=>clearInterval(timer);

},[]);

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">
Analytics
</div>

<ReactECharts

style={{
height:420
}}

option={{

animation:false,

backgroundColor:"transparent",

grid:{
left:35,
right:15,
top:25,
bottom:30
},

xAxis:{
type:"category",
show:false,
data:history.map((_,i)=>i)
},

yAxis:{
type:"value",
min:0,
max:100,
splitLine:{
lineStyle:{
color:"rgba(255,255,255,.05)"
}
}
},

series:[{

type:"line",

smooth:true,

showSymbol:false,

data:history,

lineStyle:{
width:3,
color:"#8b5cf6"
},

areaStyle:{
color:"rgba(139,92,246,.15)"
}

}]

}}

>

</ReactECharts>

</div>

);

}
