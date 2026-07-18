import fs from "fs";

const registry_path="/ai/models/router/models.json";

export const model_registry=fs.existsSync(registry_path)
  ?JSON.parse(fs.readFileSync(registry_path,"utf8"))
  :{};

export function get_model(
  name: keyof typeof model_registry
){
  return model_registry[name];
}

export function list_models(){
  return model_registry;
}
export * from "./runtime.js";
