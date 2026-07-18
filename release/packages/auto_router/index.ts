import {
  set_active_model,
  chat
} from "../provider_manager/index.js";

export async function auto_chat(
  prompt:string
){

  const text=prompt.toLowerCase();

  let model="chat";

  if(
    text.includes("python") ||
    text.includes("javascript") ||
    text.includes("typescript") ||
    text.includes("fastapi") ||
    text.includes("code") ||
    text.includes("bug") ||
    text.includes("sql")
  ){
    model="coder_pro";
  }

  else if(
    text.includes("why") ||
    text.includes("reason") ||
    text.includes("compare") ||
    text.includes("explain")
  ){
    model="reasoner";
  }

  else if(
    text.includes("image") ||
    text.includes("photo") ||
    text.includes("vision")
  ){
    model="vision";
  }

  set_active_model(model);

  const messages=[
    {
      role:"user",
      content:prompt
    }
  ];

  const content=await chat(messages);

  return{
    model,
    content
  };

}
