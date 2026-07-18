import axios from "axios";
import { ENV } from "../../config/index.js";
import type { chat_request, chat_response } from "./types.js";

export async function chat(
  request: chat_request
): Promise<chat_response> {
  const response = await axios.post(
    ENV.LLAMA_CPP_URL + "/v1/chat/completions",
    request
  );

  return response.data;
}
