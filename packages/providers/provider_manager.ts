import { provider_catalog, provider_completion } from "./adapters.js";

export interface provider_response {
  content: string;
}

export class provider_manager {
  async llama_cpp(
    model: string,
    prompt: string
  ): Promise<provider_response> {
    const provider=provider_catalog.find(value=>value.name==="llama.cpp");
    if(!provider) throw new Error("llama_cpp_provider_not_configured");
    return {content:await provider_completion(provider,[{role:"user",content:prompt}])};
  }

  async vllm(
    model: string,
    prompt: string
  ): Promise<provider_response> {
    const provider=provider_catalog.find(value=>value.name==="vllm");
    if(!provider) throw new Error("vllm_provider_not_configured");
    return {content:await provider_completion(provider,[{role:"user",content:prompt}],model)};
  }
}

export const providers = new provider_manager();
