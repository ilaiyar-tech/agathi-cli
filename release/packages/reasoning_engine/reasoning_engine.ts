import { router } from "../router/index.js";

export interface ReasoningStep {
  thought: string;
  action?: string;
  result?: string;
}

export class reasoning_engine {
  async reason(prompt: string, context: string[] = []): Promise<ReasoningStep[]> {
    const messages = [
      {
        role: "system",
        content: `You are a reasoning engine. Think step-by-step to solve the user's problem. Output your thoughts as a JSON array of objects with keys "thought" and optionally "action". Context:\n${context.join("\n")}`
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await router.reasoner(messages);
    
    try {
      // Find JSON array in the response
      const match = response.content.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]) as ReasoningStep[];
      }
    } catch (e) {
      // Fallback
    }
    
    return [{ thought: response.content }];
  }
}

export const reasoner = new reasoning_engine();
