import { existsSync, readFileSync } from "fs";
import { provider_catalog, provider_completion, provider_health as check_provider_health, type provider } from "../providers/adapters.js";

const registry_path="/ai/models/router/models.json";
const config=existsSync(registry_path)
  ?JSON.parse(readFileSync(registry_path,"utf8"))
  :{};

import { get_active_model, set_active_model } from "../model_manager/index.js";

export function get_models() {
  const active = get_active_model();
  return provider_catalog.map(provider=>({...provider,active:provider.name===active}));
}

export { get_active_model, set_active_model };

export async function chat(messages:any[]) {
  const active = get_active_model();
  const candidates:provider[]=active in config
    ?[{url:"http://127.0.0.1:8012",name:"llama.cpp",type:"llama.cpp"}]
    :provider_catalog.filter(provider=>provider.name===active).concat(provider_catalog.filter(provider=>provider.name!==active));

  let failure:unknown;
  for(const provider of candidates){
    try{
      return await provider_completion(provider,messages);
    }catch(error){failure=error;}
  }
  throw failure instanceof Error?failure:new Error("no_provider_available");
}

export async function provider_health(){
  const active = get_active_model();
  return Promise.all(provider_catalog.map(async provider=>({...provider,healthy:await check_provider_health(provider),active:provider.name===active})));
}
