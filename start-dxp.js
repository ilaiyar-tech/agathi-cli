import { dxp } from "./dist/packages/developer_experience/index.js";
dxp.loadConfig({ port: 9988, host: "127.0.0.1" });
await dxp.startApiGateway();
console.log("Ilaiyar DXP API Gateway is running on port 9988");
