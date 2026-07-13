import { vision_panel } from "../components/vision/vision_panel";
import { chat_history } from "../components/chat/chat_history";
import { chat_panel } from "../components/chat/chat_panel";
import { chat_inspector } from "../components/chat/chat_inspector";

export function chat_page(){

return(

<div
className="grid h-full gap-6"
style={{
gridTemplateColumns:"280px minmax(0,1fr) 320px"
}}
>

{chat_history()}

{chat_panel()}

<div className="space-y-6">{chat_inspector()}{vision_panel()}</div>

</div>

);

}
