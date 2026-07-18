import fastify from "fastify";

import { runtime } from "../agent_runtime/index.js";

const app=fastify({
    logger:true
});

app.get(
    "/health",
    async()=>{
        return{
            status:"ok"
        };
    }
);

app.post(
    "/api/chat",
    async(request)=>{

        const body=request.body as{
            prompt:string;
            session_id?:string;
        };

        return runtime.chat(
            body.prompt,
            body.session_id??"default"
        );

    }
);

export async function start_server(){

    await app.listen({
        host:"0.0.0.0",
        port:8100
    });

}
