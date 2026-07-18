import axios from "axios";

export const api = axios.create({
  baseURL: window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
    ? "http://127.0.0.1:8100"
    : "https://api.tu2pu.in",
  timeout: 30000
});

// Set session Authorization headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tu2pu_session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const system = () => api.get("/system");
export const models = () => api.get("/models");
export const activeModel = () => api.get("/models/active");
export const activeProvider = () => api.get("/providers/active");

export const autoChat = (prompt: string) =>
  api.post("/auto_chat", { prompt });

export const loadModel = (name: string) =>
  api.post(`/model/${name}`);

export const deleteModel = (name: string) =>
  api.delete(`/model/${name}`);

export const getChats = () => api.get("/chats");
export const getChat = (id: string) => api.get(`/chats/${id}`);
export const createChat = (name?: string) => api.post("/chats", { name });
export const updateChat = (id: string, data: any) => api.put(`/chats/${id}`, data);
export const deleteChat = (id: string) => api.delete(`/chats/${id}`);

export const getSettings = () => api.get("/settings");
export const updateSettings = (data: any) => api.put("/settings", data);

export const getDownloads = () => api.get("/downloads");
export const startDownload = (data: { model: string; url: string; destination?: string }) => api.post("/downloads", data);
export const cancelDownload = (id: string) => api.delete(`/downloads/${id}`);

export const getApiKeys = () => api.get("/admin/apikeys");
export const createApiKey = (data: { name: string }) => api.post("/admin/apikeys", data);
export const deleteApiKey = (key: string) => api.delete(`/admin/apikeys/${encodeURIComponent(key)}`);

export const getWhatsappStatus = () => api.get("/whatsapp/status");
export const linkWhatsapp = () => api.post("/whatsapp/link");
export const unlinkWhatsapp = () => api.post("/whatsapp/unlink");
export const testWhatsapp = () => api.post("/whatsapp/test");

// Auth API Endpoints
export const signup = (data: any) => api.post("/auth/signup", data);
export const login = (data: any) => api.post("/auth/login", data);
export const logout = () => api.post("/auth/logout");
export const getSession = () => api.get("/auth/session");
export const forgotPassword = (data: any) => api.post("/auth/forgot-password", data);
export const updateProfile = (data: any) => api.put("/auth/profile", data);
export const deleteAccount = () => api.delete("/auth/account");

// Report API Endpoints
export const submitReport = (data: any) => api.post("/report", data);

// Status and Releases API
export const getStatus = () => api.get("/status");
export const getReleases = () => api.get("/releases");
export const getDoc = (name: string) => api.get(`/docs/${name}`);

