# tu2pu

[![Build & Test](https://github.com/ilaiyar/tu2pu/actions/workflows/ci.yml/badge.svg)](https://github.com/ilaiyar/tu2pu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Release: v1.0.0](https://img.shields.io/badge/release-v1.0.0-blue.svg)](docs/RELEASE_NOTES_v1.0.0.md)

**tu2pu** is a developer-first, local-first AI-powered CLI coding assistant and project agent built by **Ilaiyar**. It bridges the gap between stochastically generated AI answers and deterministic, test-verified software execution.

---

## 🌟 The Vision

AI coding tools often write code but fail to compile, run tests, or maintain project integrity. **tu2pu** operates as a local-first engineering agent that not only writes code but also builds workspaces, manages local/remote execution workflows, runs unit test suites, performs architectural validation, and self-corrects failures dynamically.

---

## ✨ Features

- **Decoupled Local DB Schema & State Logs:** SQLite-based workspace database (`brain.db`) managing state, session events, file caches, and project snapshots.
- **Autocompleting Interactive CLI Shell:** REPL mode (`tu2pu interactive`) with command history logs (`~/.tu2pu_history`), multiline prompting, and slash commands.
- **Multi-Agent Runtime Coordination:** Execution router utilizing specialized model prompts (`planner`, `coder`, `reasoner`, `vision`).
- **Wrangler Deployer Integration:** Standardized Cloudflare Pages and Workers target builder (`packages/cloudflare_manager`).
- **Architectural Guardrails:** Automated validation engine (`scripts/validate_architecture.ts`) keeping low-level packages isolated from high-level orchestrators.

---

## 📁 Repository Layout & Architecture

```text
├── apps/                   # Client application entry points
│   ├── cli/                # Interactive REPL, Command definitions, & Doctor commands
│   ├── dashboard/          # React + Vite interface showing active workspace sessions
│   └── server/             # Local server acting as state coordinator
├── packages/               # Core domain libraries & modules
│   ├── core/               # Shared logic, base DB schemas, & interfaces
│   ├── context_engine/     # Directory scanning, priority budgeting, & prompt serializers
│   ├── agent_runtime/      # Session agent runtime & task executors
│   ├── router/             # Model manager, provider adaptor list, & completions endpoints
│   └── cloudflare_manager/ # Wrangler-based builder deployer
├── docs/                   # Engineering guidelines & product specifications
└── scripts/                # Verification utilities (build, test, & architectural validator)
```

Read more in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## 🚀 Installation & Quick Start

### Prerequisites
- **Node.js**: `>= 20.x`
- **Git**

### Installation
You can build and link the package globally from source:
```bash
npm install -g .
```

### Running Diagnostics
Before starting, check your environment health:
```bash
tu2pu doctor
```

### Starting the REPL
Start the autocompleting interactive shell:
```bash
tu2pu interactive
```
In the interactive shell, you can use standard prompts or slash commands (e.g., `/session`, `/models`, `/workspace`, `/logs`).

---

## ⚙️ Configuration

Module configs reside in the platform directory under `~/.gemini/antigravity-cli/`:
- `thuduppu.json`: Core engine preferences
- `settings.json`: User profile settings
- `models.json`: Custom model templates
- `providers.json`: Cloud/local LLM credentials

For environment overrides:
- `DEFAULT_MODEL`: Target completion model
- `DEFAULT_PROVIDER`: Default LLM router provider

---

## 🔗 Documentation Links

- **[Architecture Guide](docs/ARCHITECTURE.md):** Modular codebase layout and state design.
- **[Engineering Rules](docs/ENGINEERING_RULES.md):** Coding contracts and dependency guidelines.
- **[Platform Identity Specifications](docs/PLATFORM_IDENTITY.md):** Naming and directory layouts.
- **[Release Notes (v1.0.0)](docs/RELEASE_NOTES_v1.0.0.md):** Features and updates in the first stable release.
- **[Changelog](docs/CHANGELOG.md):** Chronological history of project changes.

---

## 🤝 Contributing

Contributions are what make the open-source community an amazing place to learn, inspire, and create. Please check our **[CONTRIBUTING.md](CONTRIBUTING.md)** file before making any changes.

---

## 📄 License

Distributed under the MIT License. See **[LICENSE](LICENSE)** for more information.
