import axios from "axios";

export const api=axios.create({
baseURL:"http://127.0.0.1:8100",
timeout:30000
});

export const system=()=>api.get("/system");

export const models=()=>api.get("/models");

export const activeModel=()=>api.get("/models/active");

export const activeProvider=()=>api.get("/providers/active");

export const autoChat=(prompt:string)=>
api.post("/auto_chat",{prompt});

export const loadModel=(name:string)=>
api.post(`/model/${name}`);

export const deleteModel=(name:string)=>
api.delete(`/model/${name}`);

export const getChats=()=>api.get("/chats");
export const getChat=(id:string)=>api.get(`/chats/${id}`);
export const createChat=(name?:string)=>api.post("/chats", { name });
export const updateChat=(id:string, data: any)=>api.put(`/chats/${id}`, data);
export const deleteChat=(id:string)=>api.delete(`/chats/${id}`);

export const getSettings=()=>api.get("/settings");
export const updateSettings=(data: any)=>api.put("/settings", data);

export const getDownloads=()=>api.get("/downloads");
export const startDownload=(data: {model: string, url: string, destination?: string})=>api.post("/downloads", data);
export const cancelDownload=(id:string)=>api.delete(`/downloads/${id}`);
