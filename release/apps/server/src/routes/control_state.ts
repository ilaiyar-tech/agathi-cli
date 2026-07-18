import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../../../../packages/config/index.js";

export type control_record=Record<string, unknown>;
type control_state={plugins:control_record[];users:control_record[];audit:control_record[];backups:control_record[];jobs:control_record[];queue:control_record[];workflows:control_record[];chats:control_record[];settings:control_record};

const state_path=path.join(PATHS.storage,"control_state.json");
const defaults:control_state={plugins:[],users:[{id:"local",name:"Local operator",email:"local@agathi",active:true}],audit:[],backups:[],jobs:[],queue:[],workflows:[],chats:[],settings:{temperature:0.7,streaming:true}};

function load():control_state{
  try{return {...defaults,...JSON.parse(fs.readFileSync(state_path,"utf8"))};}
  catch{return structuredClone(defaults);}
}

export const control_state=load();
export const control_events=new EventEmitter();

export function save_control_state(){
  fs.mkdirSync(PATHS.storage,{recursive:true});
  fs.writeFileSync(state_path,JSON.stringify(control_state,null,2));
}

export function add_audit(action:string,user="local"){
  control_state.audit.unshift({id:crypto.randomUUID(),action,user,time:new Date().toISOString()});
  control_state.audit.splice(500);
  save_control_state();
  control_events.emit("audit",control_state.audit);
}

export function update_record(items:control_record[],id:string,values:control_record){
  const item=items.find(value=>value.id===id);
  if(!item) return undefined;
  Object.assign(item,values);
  save_control_state();
  return item;
}
