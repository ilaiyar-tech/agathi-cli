Investigate why Aider requests fail while direct curl requests to /v1/chat/completions succeed.

Current behavior:
- curl POST /v1/chat/completions succeeds.
- Aider fails with:
  APIConnectionError: connect ECONNREFUSED 127.0.0.1:8012

Trace the complete execution flow:

server.ts
↓
/v1/chat/completions
↓
agent_runtime
↓
provider_manager
↓
model_router
↓
llama.cpp

Tasks:
1. Trace every function call.
2. Find every reference to localhost:8012.
3. Find every place that starts or expects llama-server.
4. Explain why curl works but Aider fails.
5. Remove duplicate execution paths.
6. Make curl, CLI, Dashboard, Browser Builder and Aider use ONE runtime pipeline.
7. Rebuild.
8. Verify with curl, CLI and Aider.
9. Explain every modified file.

Do NOT workaround the issue.
Do NOT change Aider configuration.
Fix the runtime architecture.
