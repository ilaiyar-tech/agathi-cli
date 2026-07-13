import { useEffect,useState } from "react";
import ReactECharts from "echarts-for-react";
import { use_dashboard } from "../../hooks/use_dashboard";

export function gpu_chart(){

const {system}=use_dashboard();

const [history,setHistory]=useState<number[]>([]);
const gpu=system.data?.gpu?.utilization;

useEffect(()=>{

if(gpu===undefined) return;

setHistory(prev=>{

const next=[...prev,gpu];

if(next.length>60)
next.shift();

return next;

});

},[system.data]);

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-5 text-lg font-semibold">
GPU Activity
</div>

<div className="mb-5 flex items-end justify-between">
<span className="text-sm text-gray-400">Last 60 samples</span>
<span className="text-2xl font-semibold text-cyan-300">{gpu ?? "--"}<span className="ml-1 text-sm text-gray-400">%</span></span>
</div>

<ReactECharts

style={{
height:320
}}

option={{

animation:false,

backgroundColor:"transparent",

grid:{
left:25,
right:10,
top:20,
bottom:25
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
axisLabel:{color:"#9ca3af",formatter:"{value}%"},
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

areaStyle:{color:"rgba(139,92,246,.15)"}

}]

}}

>

</ReactECharts>

</div>

);

}
