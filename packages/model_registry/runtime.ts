import { spawn } from "node:child_process";
import fs from "node:fs";

let process_ref:any=null;

export async function start_model(
  name:
    | "planner"
    | "chat"
    | "coder_fast"
    | "coder_pro"
    | "reasoner"
    | "vision"
){

  const registry_path="/ai/models/router/models.json";
  if(!fs.existsSync(registry_path)) throw new Error("model_registry_not_found");

  const config=JSON.parse(fs.readFileSync(registry_path,"utf8"));

  const model=config[name];

  if(!model) throw new Error("model_not_found");

  if(process_ref){
    process_ref.kill("SIGTERM");
    process_ref=null;
    await new Promise(r=>setTimeout(r,3000));
  }

  process_ref=spawn(
    "/ai/services/llama.cpp/build/bin/llama-server",
    [
      "--host","0.0.0.0",
      "--port","8012",
      "--model",model.path,
      "--gpu-layers","999",
      "--ctx-size","4096",
      "--slots",
      "--slot-save-path","/tmp/llama_slots"
    ],
    {
      stdio: "ignore"
    }
  );

  await new Promise(r=>setTimeout(r,15000));

  return model;
}

export function stop_model(){

  if(process_ref){
    process_ref.kill("SIGTERM");
    process_ref=null;
  }

}
