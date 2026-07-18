import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../config/index.js";

const registry_path=path.join(PATHS.models,"router","models.json");

const registry=fs.existsSync(registry_path)
  ?JSON.parse(fs.readFileSync(registry_path,"utf8"))
  :{};

const active_file =
  "/tmp/tu2pu_active_model";

export function list_models() {

  return Object.entries(registry).map(
    ([name, model]: any) => {

      let exists = false;
      let size = 0;

      if (
        model.path.startsWith("/") &&
        fs.existsSync(model.path)
      ) {
        exists = true;
        size = fs.statSync(model.path).size;
      }

      return {
        name,
        provider: model.provider,
        path: model.path,
        exists,
        size
      };

    }
  );

}

export function get_active_model() {

  if (!fs.existsSync(active_file)) {
    return "chat";
  }

  return fs.readFileSync(
    active_file,
    "utf8"
  ).trim();

}

export function set_active_model(
  model: string
) {

  if (!registry[model]) {
    throw new Error(
      "model_not_found"
    );
  }

  fs.writeFileSync(
    active_file,
    model
  );

  return {
    loaded: model
  };

}

export function unload_active_model(){

  if(fs.existsSync(active_file)) fs.unlinkSync(active_file);

  return {unloaded:true};

}

export function model_usage(){

  const active=get_active_model();
  const model=registry[active];
  const size=model?.path&&fs.existsSync(model.path)
    ?fs.statSync(model.path).size
    :0;

  return {active,size,loaded:Boolean(registry[active])};

}

export function delete_model(name: string) {
  if (!registry[name]) {
    throw new Error("model_not_found");
  }
  const model = registry[name];
  if (model.path && fs.existsSync(model.path)) {
    fs.unlinkSync(model.path);
  }
  delete registry[name];
  fs.writeFileSync(registry_path, JSON.stringify(registry, null, 2));
  return { deleted: true };
}
