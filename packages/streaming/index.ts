import axios from "axios";

export async function stream_chat(
  messages:any[],
  onToken:(token:string)=>void,
  base_url="https://api.tu2pu.in"
){

  const response=await axios.post(
    `${base_url}/v1/chat/completions`,
    {
      messages,
      stream:true
    },
    {
      responseType:"stream"
    }
  );

  let buffer="";
  response.data.on("data",(chunk:Buffer)=>{
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
        ()=>resolve()
      );

      response.data.on("error",reject);

    }
  );

}
