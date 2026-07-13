import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import "./styles/global.css";
import App from "./App";

import { WebSocketProvider } from "./providers/websocket_provider";

const query_client=new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(

<React.StrictMode>

<QueryClientProvider client={query_client}>
<WebSocketProvider>

<BrowserRouter>

<App/>

</BrowserRouter>

</WebSocketProvider>
</QueryClientProvider>

</React.StrictMode>

);
