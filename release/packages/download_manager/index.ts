import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PATHS } from "../config/index.js";

export type download={
  id:string; model:string; url:string; destination:string; status:"queued"|"downloading"|"completed"|"failed"|"cancelled";
  progress:number; speed:string; eta:string|null; bytes_downloaded:number; bytes_total:number|null; error?:string;
};

class download_manager {
  private readonly entries=new Map<string,download>();
  private readonly controllers=new Map<string,AbortController>();

  private readonly state_path=path.join(PATHS.storage,"downloads.json");

  constructor(){
    try{
      const persisted=JSON.parse(fs.readFileSync(this.state_path,"utf8")) as download[];
      for(const entry of persisted){
        if(entry.status==="downloading") entry.status="queued";
        this.entries.set(entry.id,entry);
        if(entry.status==="queued") void this.transfer(entry);
      }
    }catch{}
  }

  list(){return [...this.entries.values()];}

  start(model:string,url:string,destination?:string){
    const id=crypto.randomUUID();
    const target=destination??path.join(PATHS.models,"downloads",path.basename(new URL(url).pathname)||`${model}.bin`);
    const entry:download={id,model,url,destination:target,status:"queued",progress:0,speed:"0 B/s",eta:null,bytes_downloaded:0,bytes_total:null};
    this.entries.set(id,entry);
    this.persist();
    void this.transfer(entry);
    return entry;
  }

  cancel(id:string){
    const entry=this.entries.get(id);
    if(!entry) return undefined;
    this.controllers.get(id)?.abort();
    entry.status="cancelled";
    this.persist();
    return entry;
  }

  private async transfer(entry:download){
    const controller=new AbortController(); this.controllers.set(entry.id,controller);
    try{
      fs.mkdirSync(path.dirname(entry.destination),{recursive:true});
      const existing=fs.existsSync(entry.destination)?fs.statSync(entry.destination).size:0;
      const response=await fetch(entry.url,{headers:existing?{range:`bytes=${existing}-`}:{},signal:controller.signal});
      if(!response.ok&&response.status!==206) throw new Error(`download_failed:${response.status}`);
      if(!response.body) throw new Error("download_empty_response");
      const total=Number(response.headers.get("content-length")??0)||null;
      entry.bytes_downloaded=existing; entry.bytes_total=total?(existing+total):null; entry.status="downloading";this.persist();
      const started=Date.now();
      const source=Readable.fromWeb(response.body as never);
      source.on("data",(chunk:Buffer)=>{
        entry.bytes_downloaded+=chunk.length;
        const seconds=Math.max((Date.now()-started)/1000,.001);
        const speed=entry.bytes_downloaded-existing;
        const per_second=speed/seconds;
        entry.speed=`${(per_second/1024/1024).toFixed(2)} MB/s`;
        entry.progress=entry.bytes_total?Math.min(100,Math.round(entry.bytes_downloaded/entry.bytes_total*100)):0;
        entry.eta=entry.bytes_total&&per_second>0?`${Math.ceil((entry.bytes_total-entry.bytes_downloaded)/per_second)}s`:null;
        this.persist();
      });
      await pipeline(source,fs.createWriteStream(entry.destination,{flags:existing?"a":"w"}));
      if(!controller.signal.aborted){entry.status="completed";entry.progress=100;entry.eta="0s";this.persist();}
    }catch(error){
      if(entry.status!=="cancelled"){entry.status="failed";entry.error=error instanceof Error?error.message:"download_failed";this.persist();}
    }finally{this.controllers.delete(entry.id);this.persist();}
  }

  private persist(){
    fs.mkdirSync(PATHS.storage,{recursive:true});
    fs.writeFileSync(this.state_path,JSON.stringify(this.list(),null,2));
  }
}

export const downloads=new download_manager();
