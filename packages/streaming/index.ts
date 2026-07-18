import axios from "axios";

export async function stream_chat(
  messages:any[],
  onToken:(token:string)=>void,
  base_url="https://api.tu2pu.in",
  signal?: AbortSignal
){

  const response=await axios.post(
    `${base_url}/v1/chat/completions`,
    {
      messages,
      stream:true
    },
    {
      responseType:"stream",
      signal
    }
  );

  let aborted = false;
  const onAbort = () => {
    aborted = true;
    try {
      response.data.destroy();
    } catch (e) {}
  };
  if (signal) {
    signal.addEventListener("abort", onAbort);
  }

  let buffer="";
  response.data.on("data",(chunk:Buffer)=>{
      if (aborted) return;
      buffer+=chunk.toString();
      const lines=buffer.split("\n");
      buffer=lines.pop()??"";

      for(const line of lines){

        if(
          !line.startsWith("data:")
        ) continue;

        const json=line
          .replace("data:","")
          .trim();

        if(
          json==="[DONE]"
        ) continue;

        try{

          const obj=JSON.parse(json);

          const token=
            obj.choices?.[0]?.delta?.content;

          if(token){
            onToken(token);
          }

        }catch{}

      }

  });

  return new Promise<void>(
    (resolve,reject)=>{

      response.data.on(
        "end",
        ()=>{
          if (signal) signal.removeEventListener("abort", onAbort);
          if (aborted) {
            reject(new Error("Stream aborted"));
          } else {
            resolve();
          }
        }
      );

      response.data.on("error",(err: any)=>{
        if (signal) signal.removeEventListener("abort", onAbort);
        reject(err);
      });

    }
  );

}
