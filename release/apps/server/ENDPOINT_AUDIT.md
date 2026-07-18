# Frontend endpoint audit

## Existing before backend phase

- `GET /system`, `GET /models`, `GET /models/active`, `POST /model/:name`
- `GET /providers`, `GET /providers/active`, `POST /providers/:name`
- `GET /benchmark`, `POST /auto_chat`, `POST /chat`, `GET /health`

## Missing before backend phase

- `GET /plugins`, `POST /plugins/:name/toggle`, `GET /users`, `POST /users/:id/disable`, `GET /audit`
- `GET /backups`, `POST /backups/create`, `POST /backups/:id/restore`
- `GET /jobs`, `GET /queue`, `GET /workflows`, `GET /agents`, `GET /tasks`
- `GET /services`, `POST /services/:name/:action`, `GET /servers`, `POST /server/:name/:action`
- `GET /files`, `GET /knowledge`, `GET /memory`, `GET /downloads`, `POST /downloads/:id/cancel`
- `GET /rag/status`, `POST /rag/rebuild`, `GET /metrics`, `POST /vision`
- `GET /version`, `GET /config`, `POST /admin/restart`, `POST /admin/shutdown`, `POST /admin/cache/clear`
- `GET /providers/health`, `POST /providers/:name/activate`, `GET /models/usage`, `POST /models/unload`, `POST /chat/stream`
- WebSockets: `/ws/system`, `/ws/logs`, `/ws/downloads`, `/ws/jobs`, `/ws/queue`, `/ws/gpu`, `/ws/provider`, `/ws/chat`, `/ws/terminal`

## Duplicates and broken contracts before backend phase

- `/health` was defined in both server entrypoints; the dashboard server now owns the route.
- `/chat` and `/api/chat` are parallel entrypoint APIs; the dashboard consumes `/chat`.
- `/providers` returned a model registry object, while its frontend expects provider records.
- `/providers/:name/activate` and `/ws/logs` were consumed by the frontend but did not exist.
- `/system` returned GPU CSV text, while dashboard consumers expect a structured object.
- The terminal connected to `/ws/logs`, so it could not send stdin, resize, or retain sessions.
- Registry modules read `/ai/models/router/models.json` during import and prevented the backend from starting when the optional AI volume was absent.

## Unused frontend API surface

- No frontend call currently creates downloads or searches RAG, but `POST /downloads` and `GET /rag/search` are available for those workflows.
