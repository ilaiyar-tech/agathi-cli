# Platform Identity Specification

## 1. Brand & Naming

* **Product Name:** tu2pu
* **Repository:** `thudupu-ai`
* **Organization:** `Ilaiyar`
* **Package:** `thuduppu-ai`
* **Primary CLI:** `tu2pu`
* **Alternative CLI:** `thu2pu`
* **Legacy CLI:** `agathi` (Compatibility mode only)
* **Versioning:** Semantic Versioning (SemVer)

---

## 2. Platform Compatibility

Every release must verify version compatibility before startup.

* **Repository Version:** `1.0.0`
* **CLI Version:** `1.0.0`
* **Platform Schema Version:** `1.0.0`
* **Database Schema Version:** `1.0.0`
* **Plugin API Version:** `1.0.0`
* **Workspace Version:** `1.0.0`
* **Telemetry Version:** `1.0.0`

---

## 3. Repository Layout

* **Repository Root:** `/home/agathi/ilaiyar-tech/thudupu-ai/`
* **Applications:** `apps/`
* **Platform:** `packages/`
* **Plugins:** `plugins/`
* **Documentation:** `docs/`
* **Logs:** `logs/`
* **Scripts:** `scripts/`
* **Tests:** `tests/`

---

## 4. Runtime & State Directories

### Configuration & State
* **Configuration:** `/home/agathi/.gemini/antigravity-cli/`
* **Cache:** `/home/agathi/.gemini/antigravity-cli/cache/`
* **Runtime Database:** `/home/agathi/.gemini/antigravity-cli/brain/`
* **Logs:** `/home/agathi/ilaiyar-tech/thudupu-ai/logs/`
* **Temporary Files:** `/home/agathi/.gemini/antigravity-cli/tmp/`
* **Downloads:** `/home/agathi/.gemini/antigravity-cli/downloads/`
* **Models:** `/home/agathi/.gemini/antigravity-cli/models/`
* **Workspaces:** `/home/agathi/.gemini/antigravity-cli/workspaces/`

### Runtime State Directories (`state/`)
* **runtime/**
* **sessions/**
* **downloads/**
* **cache/**
* **logs/**
* **exports/**
* **backups/**

---

## 5. Configuration File Names

All modules must restrict themselves to these explicit configuration files under the configuration folder:

* `thuduppu.json`
* `workspace.json`
* `models.json`
* `providers.json`
* `plugins.json`
* `telemetry.json`
* `memory.json`
* `workflow.json`
* `settings.json`

---

## 6. Environment Variables

### Core
* `WHATSAPP_ADMIN_NUMBER`
* `ADMIN_USERNAME`
* `ADMIN_PASSWORD`
* `TELEMETRY_WORKSPACE_ID`

### Platform
* `THUDUPPU_HOME`
* `THUDUPPU_CONFIG`
* `THUDUPPU_CACHE`
* `THUDUPPU_MODELS`
* `THUDUPPU_WORKSPACE`
* `THUDUPPU_LOGS`
* `THUDUPPU_DATABASE`

### AI Runtime
* `DEFAULT_MODEL`
* `DEFAULT_PROVIDER`
* `DEFAULT_CONTEXT_SIZE`
* `GPU_ENABLED`
* `GPU_DEVICE`

---

## 7. SQLite Databases & Ownership

Each engine owns its database schema. External engines must consume APIs and never write directly to another engine's database:

### `brain.db`
* **Owner:** Platform Runtime
* **Contains:** `accuracy_telemetry`, `agent_intelligence_telemetry`, `agent_sessions`, `agent_tasks`, `agent_messages`, `tui_workspaces`

### `memory.db`
* **Owner:** Memory Engine
* **Contains:** `memories`, `summaries`, `embeddings`, `knowledge_links`

### `models.db`
* **Owner:** Model Intelligence Engine
* **Contains:** `installed_models`, `benchmarks`, `routing_history`, `model_profiles`

### `workspace.db`
* **Owner:** Workspace Engine
* **Contains:** `layouts`, `widgets`, `themes`, `sessions`

---

## 8. Telemetry Namespace

Standardized event telemetry prefixes:

* `runtime.*` (`runtime.started`, `runtime.stopped`, `runtime.failed`)
* `model.*` (`model.loaded`, `model.unloaded`, `model.benchmarked`)
* `agent.*` (`agent.created`, `agent.started`, `agent.completed`, `agent.failed`)
* `workspace.*` (`workspace.loaded`, `workspace.saved`, `workspace.closed`)
* `accuracy.*` (`accuracy.verified`, `accuracy.failed`)
* `memory.*` (`memory.created`, `memory.updated`, `memory.retrieved`)

---

## 9. Naming Convention

* **Packages:** `snake_case`
* **Files:** `snake_case.ts`
* **Classes:** `PascalCase`
* **Functions:** `camelCase`
* **Constants:** `UPPER_SNAKE_CASE`
* **Events:** `dot.notation`

---

## 10. Reserved Platform Namespaces & Internal Prefixes

Plugins should never emit identifiers matching internal prefixes:

* `internal.*`
* `system.*`
* `platform.*`
* `runtime.*`
* `workspace.*`

### Additional Reserved Namespaces
* `agent.*`
* `memory.*`
* `knowledge.*`
* `model.*`
* `provider.*`
* `tool.*`
* `workflow.*`
* `accuracy.*`
* `telemetry.*`
* `business.*`

---

## 11. Plugin Identity Rules

Every platform plugin must declare metadata using a standardized manifest format:

* **Plugin Name**
* **Plugin ID**
* **Version**
* **Author**
* **Dependencies**
* **Permissions**
* **Capabilities**
* **Entry Point**

---

## 12. Release Levels

Maturity level identifiers:

* `Development`
* `Alpha`
* `Beta`
* `Release Candidate`
* `Stable`
* `Long-Term Support`

---

## 13. System Lifecycle Sequences

### Boot Sequence
```text
Boot Loader
    ↓
Configuration
    ↓
Logging
    ↓
Database
    ↓
Platform Kernel
    ↓
Provider System
    ↓
Model System
    ↓
Memory
    ↓
Knowledge
    ↓
Runtime
    ↓
Workspace
    ↓
CLI
    ↓
Ready
```

### Graceful Shutdown Sequence
```text
Stop Requests
    ↓
Stop Agents
    ↓
Flush Memory
    ↓
Flush Telemetry
    ↓
Save Workspace
    ↓
Close Databases
    ↓
Shutdown
```

---

## 14. Product Identity Rules

* Never expose the internal repository name in user-facing output.
* User-facing help must display **tu2pu**.
* `tu2pu` is the primary command.
* `thu2pu` is an official alias.
* `agathi` exists only for backward compatibility and should always display a deprecation notice before forwarding execution.
* New features must use the **tu2pu** branding consistently.

---

## 15. Definition of Identity Compliance

A release is identity-compliant only if:
* Repository name matches the specification.
* CLI commands match the specification.
* Documentation uses the correct branding.
* Help output uses the correct branding.
* Environment variables follow the standard.
* Telemetry namespaces follow the standard.
* Log files follow the standard.
* Workspace metadata follows the standard.
* Generated reports follow the standard.
* No user-facing output references deprecated branding except the compatibility message for `agathi`.

---

## 16. Immutable Rules

* These rules are architectural contracts. Do not change without an approved architecture revision.
* Future implementations must extend the platform rather than replacing existing systems.
* Backward compatibility should be preserved whenever reasonably possible.
* Repository structure is stable.
* Platform identity is stable.
* Public CLI commands are stable.
* Telemetry namespaces are stable.
* Database ownership is stable.
