export interface chat_message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface chat_request {
  model: string;
  messages: chat_message[];
  temperature?: number;
  max_tokens?: number;
}

export interface chat_response {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
  }[];
}
