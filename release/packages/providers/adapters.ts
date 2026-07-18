import axios from "axios";
import { ENV } from "../config/index.js";

export type provider_name="llama.cpp"|"vllm"|"ollama"|"openai";
export type provider={name:provider_name;type:string;url:string};

export const provider_catalog:provider[]=[
  {name:"llama.cpp",type:"llama.cpp",url:ENV.LLAMA_CPP_URL},
  {name:"vllm",type:"vllm",url:ENV.VLLM_URL},
  {name:"ollama",type:"ollama",url:process.env.OLLAMA_URL??"http://127.0.0.1:11434"},
  {name:"openai",type:"openai",url:"https://api.openai.com"}
];

export async function provider_completion(provider:provider,messages:unknown[],model?:string){
  const response=await axios.post(`${provider.url}/v1/chat/completions`,{messages,stream:false,...(model?{model}:{})},{timeout:600000,headers:provider.name==="openai"&&process.env.OPENAI_API_KEY?{authorization:`Bearer ${process.env.OPENAI_API_KEY}`}:{}});
  return response.data.choices?.[0]?.message?.content??"";
}

export async function provider_health(provider:provider){
  try{await axios.get(`${provider.url}/health`,{timeout:1500});return true;}catch{return false;}
}
