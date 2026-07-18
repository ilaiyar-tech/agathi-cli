import axios from "axios";
import { ENV } from "../config/index.js";

export type provider_name="llama.cpp"|"vllm"|"ollama"|"openai"|"lmstudio";
export type provider={name:provider_name;type:string;url:string};

export const provider_catalog:provider[]=[
  {name:"llama.cpp",type:"llama.cpp",url:ENV.LLAMA_CPP_URL},
  {name:"vllm",type:"vllm",url:ENV.VLLM_URL},
  {name:"ollama",type:"ollama",url:process.env.OLLAMA_URL??"http://127.0.0.1:11434"},
  {name:"openai",type:"openai",url:"https://api.openai.com"},
  {name:"lmstudio",type:"lmstudio",url:process.env.LMSTUDIO_URL??"http://127.0.0.1:1234"}
];

export async function provider_completion(provider:provider,messages:unknown[],model?:string){
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider.name === "openai" && process.env.OPENAI_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.OPENAI_API_KEY}`;
  }
  const response=await axios.post(`${provider.url}/v1/chat/completions`,{messages,stream:false,...(model?{model}:{})},{timeout:600000,headers});
  return response.data.choices?.[0]?.message?.content??"";
}

export async function provider_health(provider:provider){
  try{
    if (provider.name === "ollama" || provider.name === "lmstudio") {
      const res = await axios.get(`${provider.url}/`, { timeout: 1500 });
      return res.status === 200;
    }
    await axios.get(`${provider.url}/health`,{timeout:1500});
    return true;
  }catch{
    try {
      const res = await axios.get(`${provider.url}/`, { timeout: 1000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
