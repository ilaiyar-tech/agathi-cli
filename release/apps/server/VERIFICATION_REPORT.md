# Backend verification report

Verified against the compiled dashboard backend entrypoint: `dist/apps/server/src/server.js`.

## REST endpoints

| Endpoint | Result | Data / contract validation | Dashboard consumer |
| --- | --- | --- | --- |
| `GET /health` | pass | `200`, `status: ok`, runtime uptime | Admin panel |
| `GET /version` | pass | `200`, version `0.1.0` | Admin panel |
| `GET /config` | pass | `200`, environment and port | Admin panel |
| `GET /system` | pass | `200`, live CPU, RAM, GPU, disk metrics | Header, dashboard cards, charts, logs, settings |
| `GET /benchmark` | pass | `200`, live GPU telemetry | Backend-only |
| `GET /models` | pass | `200`, installed model paths and byte sizes | Models panel |
| `GET /models/active` | pass | `200`, active model | Header, models, router, inspector |
| `POST /model/:name` | contract error path verified | Invalid model returns `model_not_found` | Models panel, router |
| `GET /models/usage` | pass | `200`, active model and byte usage | Backend-only |
| `POST /models/unload` | response verified | `200`, unload response | Backend-only |
| `GET /models/queue` | pass | `200`, empty queue | Backend-only |
| `GET /providers` | pass | `200`, provider records | Providers panel |
| `GET /providers/active` | pass | `200`, active provider | Header, inspector, settings |
| `GET /providers/health` | pass | `200`, real provider health checks | Backend-only |
| `POST /providers/:name` | contract error path verified | Invalid provider returns `model_not_found` | Backend-only |
| `POST /providers/:name/activate` | pass | Valid provider switch emits update | Providers panel |
| `POST /auto_chat` | pass | `200`, provider-generated response | Chat store |
| `POST /chat` | pass | `200`, provider-generated response and session id | Backend API |
| `POST /chat/stream` | pass | `200`, SSE token events followed by `done` | Backend API |
| `GET /plugins` | partial | `200`, persisted list; empty in this environment | Plugins panel |
| `POST /plugins/:name/toggle` | partial | `200`, but creates a local synthetic plugin | Plugins panel |
| `GET /users` | partial | `200`, local static operator record | Users panel |
| `POST /users/:id/disable` | contract error path verified | Unknown user returns `404` | Users panel |
| `GET /audit` | partial | `200`, persisted audit list | Audit panel |
| `GET /backups` | partial | `200`, empty persisted list | Backups panel |
| `POST /backups/create` | not invoked | Mutating route not exercised | Backups panel |
| `POST /backups/:id/restore` | failed | Route returns `restored: false` instead of restoring | Backups panel |
| `GET /jobs` | partial | `200`, empty state list | Jobs panel |
| `GET /queue` | partial | `200`, empty state list | Queue panel |
| `GET /workflows` | partial | `200`, empty state list | Workflows panel |
| `GET /agents` | failed | Static runtime record, not live agent state | Agents panel |
| `GET /tasks` | partial | `200`, aliases empty jobs state | Tasks panel |
| `GET /services` | failed | Static running/port values | Services panel |
| `POST /services/:name/:action` | failed | Returns acceptance only; no service action | Services panel |
| `GET /servers` | failed | Static service values | Server manager |
| `POST /server/:name/:action` | failed | Returns acceptance only; no server action | Server manager |
| `GET /files` | partial | `200`, empty because workspace has no indexed files | Files panel |
| `GET /knowledge` | partial | `200`, empty state-derived document list | Knowledge panel |
| `GET /memory` | pass | `200`, persisted conversation records | Memory panel |
| `GET /memory/sessions` | pass | `200`, persisted session aggregates | Backend-only |
| `GET /downloads` | partial | `200`, persisted download list; empty in this environment | Downloads panel |
| `POST /downloads` | not invoked | Requires a real download URL | Backend-only |
| `POST /downloads/:id/cancel` | contract error path verified | Unknown id returns `404` | Downloads panel |
| `GET /rag/status` | failed | Returns literal `unconfigured` embedding/reranker values | RAG panel |
| `POST /rag/rebuild` | partial | `200`, no documents found in workspace | RAG panel |
| `GET /rag/search` | partial | `200`, empty result set | Backend-only |
| `GET /metrics` | failed | Literal zero metrics | Metrics panel |
| `POST /vision` | failed | Literal unavailable-provider message | Vision panel |
| `POST /admin/cache/clear` | partial | `200`, audit event only; no cache runtime is attached | Developer panel |
| `POST /admin/restart` | failed | Returns acceptance only; no restart | Developer panel |
| `POST /admin/shutdown` | failed | Returns acceptance only; no shutdown | Developer panel |

## WebSockets

| WebSocket | Result | Observed payload |
| --- | --- | --- |
| `/ws/system` | pass | Live timestamp and GPU telemetry |
| `/ws/logs` | pass | Live telemetry log event |
| `/ws/gpu` | pass | Live GPU utilization, VRAM, temperature, power |
| `/ws/provider` | pass | Provider activation event: `llama.cpp` |
| `/ws/terminal` | pass | PTY session and stdout from `printf websocket-ok` |
| `/ws/chat` | pass | Provider-native token event: `Sure` |
| `/ws/downloads` | partial | Connection accepted; no active download existed to emit an update |
| `/ws/jobs` | partial | Connection accepted; no job producer/update exists |
| `/ws/queue` | partial | Connection accepted; no queue producer/update exists |

## UI compatibility

Static consumer inspection confirms every dashboard `fetch()`/Axios route maps to a registered route and expected response shape. Browser rendering was not exercised in this runtime verification. The failed/partial rows above therefore remain unverified as correct live UI data.

## Validation outcome

Live telemetry, model metadata, memory, chat, SSE chat, PTY terminal, and the system/log/GPU/provider/chat WebSockets are validated. The endpoints marked **failed** or **partial** still contain placeholders, static state, no runtime producer, or no data in this environment; no implementation changes were made during verification.
