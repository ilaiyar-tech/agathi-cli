export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptPlanOptions {
  system_prompt?: string;
  history?: Message[];
  context?: string[];
  user_prompt: string;
}

export class prompt_planner {
  
  plan(options: PromptPlanOptions): Message[] {
    const messages: Message[] = [];

    if (options.system_prompt) {
      messages.push({
        role: "system",
        content: options.system_prompt
      });
    }

    if (options.history && options.history.length > 0) {
      messages.push(...options.history);
    }

    if (options.context && options.context.length > 0) {
      messages.push({
        role: "user",
        content: `Context information:\n\n${options.context.join("\n\n")}`
      });
    }

    messages.push({
      role: "user",
      content: options.user_prompt
    });

    return messages;
  }

}

export const planner = new prompt_planner();
