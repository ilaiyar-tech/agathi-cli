import {useState} from "react";

export function vision_panel(){

const [image,setImage]=useState<File>();

const [result,setResult]=useState("");

async function analyze(){

if(!image) return;

const form=new FormData();

form.append("image",image);

const r=await fetch(
"http://127.0.0.1:8100/vision",
{
method:"POST",
body:form
}
);

const data=await r.json();

setResult(
data.content ??
JSON.stringify(data,null,2)
);

}

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">

<div className="mb-6 text-xl font-semibold">
Vision
</div>

<input

type="file"

accept="image/*"

onChange={e=>
setImage(
e.target.files?.[0]
)
}

/>

<button

onClick={analyze}

className="mt-5 rounded-2xl bg-violet-600 px-6 py-3"

>

Analyze

</button>

<pre className="mt-6 whitespace-pre-wrap">

{result}

</pre>

</div>

);

}
