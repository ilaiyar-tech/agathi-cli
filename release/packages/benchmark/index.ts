import { execSync } from "node:child_process";

export function benchmark(){

  let gpu={};

  try{

    const result=execSync(
      "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw --format=csv,noheader,nounits"
    ).toString().trim();

    const [
      utilization,
      memory_used,
      memory_total,
      temperature,
      power
    ]=result.split(",");

    gpu={
      utilization:Number(utilization),
      memory_used:Number(memory_used),
      memory_total:Number(memory_total),
      temperature:Number(temperature),
      power:Number(power)
    };

  }catch{}

  return{
    timestamp:Date.now(),
    gpu
  };

}
