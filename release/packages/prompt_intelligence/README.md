# Prompt Intelligence Layer (PIL)

The **Prompt Intelligence Layer (PIL)** is a runtime layer in Context OS designed to sit between raw user prompts and the downstream planners/execution engines. Its primary purpose is to transform unstructured natural language input into a structured, validated, and cached execution plan (represented by a **Prompt Contract**).

## Architecture

```
User Prompt
    │
    ▼
┌────────────────────────────────────────────────────────┐
│               Prompt Intelligence Layer                │
│                                                        │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │  Prompt Receiver   │      │  Identity Manager  │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │  Intent Analyzer   │      │   Goal Extractor   │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │ Workspace Resolver │      │  Session Resolver  │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │  Context Resolver  │      │ Knowledge Resolver │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │  Memory Resolver   │      │  Evidence Resolver │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │ Prompt Classifier  │      │ Contract Generator │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │Prompt Graph Manager│      │ Prompt Compressor  │   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             ▼                           ▼              │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │    Prompt Cache    │      │Context Builder (RT)│   │
│   └────────────────────┘      └────────────────────┘   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
                         Planner
                            │
                            ▼
                     Execution Engine
```

## Core Sub-components

1. **Prompt Identity Manager**: Ensures every user prompt receives a unique ID, session ID, workspace ID, timestamp, and tracks current execution state.
2. **Intent Analyzer**: Extracts semantic intents such as file analysis, terminal commands, git actions, investigations, and deployment tasks.
3. **Goal Extractor**: Extracts specific goals/sub-goals from unstructured prompts.
4. **Workspace Resolver**: Maps pathing, patterns, and relevant files in the active workspace.
5. **Session Resolver**: Creates/resolves context sessions.
6. **Context Resolver**: Integrates active context, indexed state history, and metadata.
7. **Knowledge Resolver**: Resolves development patterns and internal/external references.
8. **Memory Resolver**: Queries historical messages and past execution records.
9. **Evidence Resolver**: Pulls validation outcomes, test assertions, and audit logs.
10. **Prompt Classifier**: Identifies prompt category and security/risk levels (`safe`, `restricted`, `privileged`).
11. **Prompt Contract Generator**: Formulates the typed contract specifying tool dependencies, model requirements, retry policies, and execution mode.
12. **Prompt Graph Manager**: Persists hierarchical parent-child relationships, chains of execution, and decision nodes.
13. **Prompt Compressor**: Summarizes conversation history into active, completed, and pending decisions.
14. **Prompt Cache**: Handles exact matches, semantic similarity matches, and recent workspace caches.
15. **Runtime Context Builder**: Aggregates all structural context to pass downstream.

## Schemas (SQLite)

### 1. `prompt_contracts`
Stores generated Prompt Contracts.
* `id` (primary key)
* `goal`, `intent`, `priority`, `execution_mode`
* JSON arrays: `required_tools`, `required_models`, `required_context`, `required_memory`
* `expected_output`
* `verification_required` (boolean), `save_memory` (boolean)
* `retry_policy` (JSON string)

### 2. `prompt_graph`
Stores prompt relationships.
* `prompt_id` (primary key)
* `parent_prompt_id`
* JSON strings: `child_prompt_ids`, `related_prompt_ids`, `execution_chain`, `decision_history`

### 3. `prompt_cache`
Stores exact and semantic caches.
* `cache_key` (primary key)
* `cache_type`
* `value`
* `timestamp`
