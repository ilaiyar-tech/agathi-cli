# Release Notes - tu2pu v1.0.0

We are proud to announce the official public release of **tu2pu v1.0.0**! 

**tu2pu** is a developer-first, local-first AI-powered CLI development platform built by Ilaiyar. It transforms codebases from stochastic guess generation into structured, validated software engineering environments.

---

## What's New in v1.0.0

### 🛡️ Rebranding & Endpoint Re-linking
- Complete transition from legacy identities (`Agathi`, `Thuduppu`) to **`tu2pu`**.
- Re-linked all public API requests to use `https://api.tu2pu.in`.
- Backward-compatible `agathi` wrapper with clear deprecation guidance.

### ⌨️ Next-Generation CLI Shell
- Rich Commander CLI with autocompletes, ora spinners, and chalk coloring.
- Autocomplete, multiline prompts, and session history logs saved to `~/.tu2pu_history`.
- In-shell slash commands (`/session`, `/models`, `/projects`, `/tools`, `/workspace`, `/logs`).

### 📦 Platform & Database Registry
- Clean SQLite backend database (`brain.db`) managing state, prompts, snapshots, and accuracy logs.
- Decoupled event bus messaging for cross-module synchronization.

### ⚙️ Cognitive Execution Engine
- Execution routing between specialized models (`planner`, `coder_pro`, `reasoner`, `vision`).
- Autonomous tool execution loop with verification checks and self-correction trust protocols.

---

## Getting Started

### Prerequisites
- Node.js >= 20.x
- Git

### Quick Start
Install globally:
```bash
npm install -g .
```

Verify the installation:
```bash
tu2pu doctor
```

Launch the interactive coding assistant:
```bash
tu2pu interactive
```
