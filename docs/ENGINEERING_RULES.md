# tu2pu Engineering Rules

This document outlines the core architectural boundaries, design patterns, and standards required to maintain the stability, performance, and reliability of the tu2pu codebase.

---

## 1. Architectural Integrity

We enforce strict separation of concerns across our packages:
* **`packages/core`**: Domain logic, state engines, and common helper utilities.
* **`packages/context_engine`**: Collecting, Prioritizing, and Compressing context.
* **`packages/agent_runtime`**: Standard prompt assembling and model execution routes.
* **`packages/cloudflare_manager`**: Wrangler-based pages and workers deployer.

### Dependency Flow Guidelines:
1. **No Circular Dependencies:** Lower-level packages (e.g. `packages/core`) must never import from higher-level ones (e.g. `packages/agent_runtime` or `apps/*`).
2. **Validator Compliance:** Every build is checked using the built-in dependency validator (`scripts/validate_architecture.ts`). Running this check is mandatory before opening any Pull Request.

---

## 2. API Design & Security

* **Remote Endpoint Policy:** All remote model queries, agent streamings, and catalog fetch requests must go through the rebranded proxy endpoint: `https://api.tu2pu.in`.
* **API Key Formats:** Developer auth keys must be prefixed with `sk_tu2pu_`.
* **Secure Defaults:** Local database locks, file creations, and temp active model paths must reside in standard, isolated locations (e.g., `/tmp/tu2pu_active_model`).

---

## 3. CLI & Shell Standards

* **Deprecation Layer:** The command name `agathi` is deprecated. Any execution from legacy binaries must show a deprecation notice and transparently forward arguments to `tu2pu`.
* **Standard Streams:** Always preserve exit codes, `stdout`, `stderr`, and interactive `stdin` streams when forwarding commands.

---

## 4. Testing & Verification

* **Unit Testing:** Write unit tests for all domain functions under the matching `.test.ts` naming convention.
* **Heuristic Checks:** Keep model accuracy evaluations and testing assertions clean, deterministic, and mock-based where remote API queries are not required.
* **Test Success:** The test suite `npm test` must run with 100% success before any release build is compiled.
