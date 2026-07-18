import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT || 8100),

  LLAMA_CPP_URL:
    process.env.LLAMA_CPP_URL ||
    "http://127.0.0.1:8081",

  VLLM_URL:
    process.env.VLLM_URL ||
    "http://127.0.0.1:8000",

  QDRANT_URL:
    process.env.QDRANT_URL ||
    "http://127.0.0.1:6333",

  REDIS_URL:
    process.env.REDIS_URL ||
    "redis://127.0.0.1:6379",

  POSTGRES_URL:
    process.env.POSTGRES_URL ||
    "postgres://postgres:postgres@127.0.0.1:5432/agathi"
};
