You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the project roadmap.  
• Read the architecture documents.  
• Read engineering rules.  
• Read implementation guidelines.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 01 — Foundation.

OBJECTIVE

Build the complete engineering foundation required by every higher layer.

SCOPE

Core  
• Shared Types  
• Shared Interfaces  
• Shared Contracts  
• Shared Constants  
• Shared Utilities

Configuration  
• Environment Loader  
• Config Registry  
• Config Validation  
• Feature Flags

Error System  
• Base Errors  
• Typed Errors  
• Error Codes  
• Error Serialization

Logging  
• Logger  
• Log Levels  
• Structured Logging  
• Request Logging

Events  
• Event Contracts  
• Event Types  
• Event Metadata  
• Event Interfaces

Dependency Injection  
• Container  
• Service Registration  
• Service Resolution  
• Lifecycle Management

Utilities  
• File Helpers  
• Path Helpers  
• Process Helpers  
• Async Helpers  
• Validation Helpers

Testing  
• Test Configuration  
• Mock Utilities  
• Test Helpers  
• Coverage Configuration

Repository Foundation  
• Base Repository  
• Repository Interfaces  
• Common Query Helpers

Engineering  
• Path Aliases  
• Workspace References  
• Shared tsconfig  
• Shared ESLint  
• Shared Prettier

RULES

Never redesign.  
Never rename existing modules.  
Never replace architecture.  
Never duplicate existing functionality.  
Reuse existing implementations whenever possible.  
Do not implement business logic.  
Do not implement models.  
Do not implement providers.  
Do not implement runtime.  
Do not implement CLI features.

Before creating anything, verify whether it already exists.  
If it exists, improve or complete it instead of recreating it.

DEFINITION OF DONE

• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed foundation components  
2\. Files created  
3\. Files modified  
4\. Remaining Foundation work

Stop immediately after Phase 01 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 02 — Platform Core.

OBJECTIVE

Build the reusable platform that every future module depends on.

SCOPE

Platform Kernel  
• Kernel Bootstrap  
• Kernel Lifecycle  
• Kernel Configuration  
• Kernel Context

Module System  
• Module Interface  
• Module Registry  
• Module Discovery  
• Module Loader  
• Module Dependency Resolution  
• Module Lifecycle  
• Module Initialization  
• Module Shutdown

Service System  
• Service Registry  
• Service Container  
• Service Discovery  
• Service Injection  
• Service Lifecycle

Registry System  
• Module Registry  
• Service Registry  
• Feature Registry  
• Capability Registry  
• Extension Registry

Lifecycle  
• Bootstrap Manager  
• Startup Manager  
• Shutdown Manager  
• Reload Manager  
• Health Manager

Extension System  
• Extension Interface  
• Extension Loader  
• Extension Registration  
• Extension Validation

Platform Context  
• Execution Context  
• Request Context  
• Session Context  
• Shared Context

Platform Events  
• Startup Events  
• Shutdown Events  
• Module Events  
• Service Events  
• Lifecycle Events

Health  
• Platform Health  
• Module Health  
• Service Health  
• Diagnostics  
• Self Check

RULES

Never redesign.  
Never rename existing modules.  
Never replace architecture.  
Never duplicate functionality.  
Reuse existing implementations whenever possible.

Do NOT implement:

• Database  
• Models  
• Providers  
• Runtime  
• Memory  
• Knowledge  
• Agents  
• Tools  
• API  
• CLI  
• Business Modules

Only implement the reusable Platform Core.

Before creating anything, verify whether it already exists.  
If it exists, improve or complete it instead of recreating it.

DEFINITION OF DONE

• Platform boots successfully  
• Module loading works  
• Service registration works  
• Dependency resolution works  
• Lifecycle management works  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Platform Core components  
2\. Files created  
3\. Files modified  
4\. Remaining Platform Core work

Stop immediately after Phase 02 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 03 — Database Foundation.

OBJECTIVE

Build the complete database platform that every higher layer depends on.

SCOPE

Database Core

• Database Bootstrap  
• Database Manager  
• Connection Manager  
• Connection Pool  
• Health Check  
• Transaction Manager

Schema System

• Schema Registry  
• Schema Loader  
• Schema Validation  
• Schema Discovery  
• Schema Metadata

Entity Foundation

Every entity must inherit common fields.

Required fields

• id  
• created\_at  
• updated\_at  
• deleted\_at  
• created\_by  
• updated\_by  
• version

Primary Keys

• UUID  
• Soft Delete Only  
• Optimistic Versioning

Repository Layer

• Base Repository  
• Repository Interfaces  
• CRUD Base Classes  
• Pagination Helpers  
• Filtering Helpers  
• Sorting Helpers  
• Search Helpers

Query System

• Query Builder  
• Transaction Helpers  
• Batch Operations  
• Bulk Insert  
• Bulk Update  
• Bulk Delete  
• Query Logging

Migration System

• Migration Configuration  
• Migration Runner  
• Migration Verification  
• Migration Status  
• Migration Locking

IMPORTANT

Never modify existing migrations.

Never delete migrations.

Never rewrite migration history.

Never regenerate historical migrations.

Create new incremental migrations only when absolutely required.

Seeder System

• Seeder Registry  
• Seeder Runner  
• Seeder Base Classes  
• Seeder Dependency Resolution  
• Idempotent Seeders

Seeder Rules

• Never duplicate records  
• Never delete user data  
• Check existence before insert  
• Support repeated execution safely

Audit System

• Audit Base  
• Change Tracking  
• Created By  
• Updated By  
• Version Tracking

Database Utilities

• UUID Helpers  
• Timestamp Helpers  
• Transaction Helpers  
• Query Helpers

Database Documentation

• Schema Documentation  
• Entity Documentation  
• Relationship Documentation  
• Migration Documentation

RULES

Never redesign.

Never rename existing tables.

Never move business logic into the database layer.

Plugins must never own schemas.

Schemas belong only to the central database package.

Repositories must consume the shared database package.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Business Tables  
• Customer Module  
• Vehicle Module  
• Queue Module  
• Billing Module  
• Runtime  
• Providers  
• Models  
• API  
• CLI

Only implement the reusable database foundation.

DEFINITION OF DONE

• Database boots successfully  
• Connection established  
• Schema registry operational  
• Repository base complete  
• Transactions verified  
• Migrations verified  
• Seed framework verified  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Database Foundation components  
2\. Files created  
3\. Files modified  
4\. Remaining Database Foundation work

Stop immediately after Phase 03 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 04 — Model System.

OBJECTIVE

Build a provider-independent model management platform capable of discovering, installing, validating, loading, monitoring, and executing local and remote AI models.

SCOPE

Model Registry

• Model Registry  
• Model Registration  
• Model Discovery  
• Model Metadata  
• Model Manifest  
• Model Catalog  
• Model Index  
• Model Search

Model Definition

• Model Interface  
• Model Types  
• Model Families  
• Model Variants  
• Model Capabilities  
• Context Window  
• Token Limits  
• Quantization Metadata  
• Licensing Metadata

Model Storage

• Model Directory Manager  
• Model Path Resolver  
• Storage Scanner  
• Storage Validation  
• Storage Cleanup

Model Installation

• Download Manager  
• Resume Downloads  
• Checksum Verification  
• Integrity Validation  
• Extraction  
• Installation  
• Update Manager  
• Uninstall Manager

Model Validation

• Manifest Validation  
• File Validation  
• Compatibility Validation  
• Runtime Validation  
• Dependency Validation

Model Loader

• Loader Interface  
• Loader Manager  
• Lazy Loading  
• Preloading  
• Unloading  
• Reloading

Model Runtime

• Runtime Adapter Interface  
• Runtime Metadata  
• Runtime Capabilities  
• Runtime Requirements

Model Sessions

• Session Manager  
• Session Lifecycle  
• Session Isolation  
• Session Cleanup

Context Management

• Context Builder  
• Context Limits  
• Token Counting  
• Context Trimming  
• Context Compression

Inference

• Completion  
• Chat Completion  
• Embeddings  
• Streaming  
• Stop Generation  
• Cancellation

Model Profiles

• Default Profiles  
• Performance Profiles  
• Memory Profiles  
• GPU Profiles  
• CPU Profiles

Caching

• Metadata Cache  
• Manifest Cache  
• Model Cache  
• Session Cache

Health

• Installed Status  
• Availability  
• Health Monitoring  
• Resource Usage  
• Memory Usage  
• GPU Usage  
• Load Time  
• Active Sessions

Diagnostics

• Model Verification  
• Compatibility Report  
• Installation Report  
• Runtime Report  
• Performance Report

Events

• ModelRegistered  
• ModelInstalled  
• ModelUpdated  
• ModelRemoved  
• ModelLoaded  
• ModelUnloaded  
• ModelValidated  
• ModelHealthChanged

Documentation

• Registry Documentation  
• Manifest Documentation  
• Runtime Documentation  
• Installation Documentation

RULES

Never redesign.

Never hardcode provider-specific logic.

Every model must implement common interfaces.

All providers must consume the Model System instead of implementing their own model management.

Support future providers without code duplication.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Provider integrations  
• Runtime execution engines  
• Memory System  
• Knowledge System  
• Agents  
• API  
• CLI  
• Business modules

Only implement the reusable Model System.

DEFINITION OF DONE

• Model Registry operational  
• Discovery operational  
• Installation operational  
• Validation operational  
• Loader operational  
• Session management operational  
• Context management operational  
• Health monitoring operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Model System components  
2\. Files created  
3\. Files modified  
4\. Remaining Model System work

Stop immediately after Phase 04 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 05 — Provider System.

OBJECTIVE

Build a provider-independent execution layer that allows the platform to communicate with any local or remote AI provider through a unified interface.

Every provider must behave identically from the perspective of the rest of the platform.

SCOPE

Provider Core

• Provider Interface  
• Provider Base Class  
• Provider Registry  
• Provider Manager  
• Provider Discovery  
• Provider Metadata  
• Provider Manifest  
• Provider Configuration  
• Provider Factory

Provider Lifecycle

• Registration  
• Initialization  
• Startup  
• Shutdown  
• Reload  
• Health Monitoring  
• Version Detection  
• Capability Detection

Provider Configuration

• Configuration Loader  
• Configuration Validation  
• Environment Variables  
• Runtime Overrides  
• Secure Secret Handling

Provider Runtime

• Connection Manager  
• Request Manager  
• Response Manager  
• Streaming Manager  
• Session Manager  
• Retry Manager  
• Timeout Manager  
• Cancellation Manager

Provider Capabilities

• Chat Completion  
• Text Completion  
• Embeddings  
• Tokenization  
• Vision  
• Audio  
• Tool Calling  
• Function Calling  
• Structured Output  
• JSON Mode

Capability Detection

• Supported Models  
• Supported Features  
• Context Window  
• Token Limits  
• Streaming Support  
• Vision Support  
• Embedding Support  
• Tool Support

Authentication

• API Key  
• Bearer Token  
• Local Authentication  
• Custom Authentication  
• Secret Storage

Provider Health

• Connectivity  
• Availability  
• Latency  
• Error Rate  
• Active Requests  
• Queue Length  
• Health Status

Error Handling

• Connection Errors  
• Timeout Errors  
• Authentication Errors  
• Rate Limits  
• Provider Errors  
• Retry Policies  
• Fallback Metadata

Provider SDK

• Common Request Format  
• Common Response Format  
• Streaming Interface  
• Error Interface  
• Metadata Interface

Built-in Providers

Implement provider adapters only.

• OpenAI Compatible  
• Ollama  
• llama.cpp  
• vLLM  
• LM Studio

Custom Provider SDK

Provide extension interfaces for future providers without modifying core platform code.

Events

• ProviderRegistered  
• ProviderStarted  
• ProviderStopped  
• ProviderReloaded  
• ProviderHealthChanged  
• ProviderRequestStarted  
• ProviderRequestCompleted  
• ProviderRequestFailed

Documentation

• Provider Architecture  
• Provider SDK  
• Provider Configuration  
• Provider Development Guide  
• Provider Capability Matrix

RULES

Never redesign.

Never hardcode provider-specific logic into the platform.

Every provider must implement the shared Provider Interface.

All providers must return the same normalized request and response structures.

The rest of the platform must never know which provider is executing a request.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Routing  
• Runtime orchestration  
• Memory  
• Knowledge  
• Agents  
• API  
• CLI  
• Business modules

Only implement the reusable Provider System.

DEFINITION OF DONE

• Provider Registry operational  
• Provider Manager operational  
• Configuration system operational  
• Built-in provider adapters implemented  
• Health monitoring operational  
• Capability detection operational  
• Unified request/response interface verified  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Provider System components  
2\. Files created  
3\. Files modified  
4\. Remaining Provider System work

Stop immediately after Phase 05 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 06 — Routing System.

OBJECTIVE

Build the intelligent routing layer responsible for selecting the correct provider, model, execution strategy, and fallback path for every AI request.

The routing system must be completely independent of any specific provider or model.

SCOPE

Routing Core

• Router Interface  
• Router Manager  
• Routing Registry  
• Routing Configuration  
• Routing Context  
• Routing Pipeline

Model Routing

• Model Selection  
• Model Matching  
• Model Prioritization  
• Default Model Resolution  
• Capability Matching  
• Context Window Matching

Provider Routing

• Provider Selection  
• Provider Prioritization  
• Provider Availability  
• Provider Capability Matching  
• Provider Affinity  
• Provider Constraints

Capability Routing

• Chat Routing  
• Completion Routing  
• Embedding Routing  
• Vision Routing  
• Audio Routing  
• Tool Calling Routing  
• Structured Output Routing

Request Analysis

• Request Classification  
• Capability Detection  
• Context Analysis  
• Resource Estimation  
• Complexity Analysis

Execution Strategy

• Best Provider Selection  
• Best Model Selection  
• Load Distribution  
• Resource Optimization  
• Latency Optimization

Load Balancing

• Round Robin  
• Least Loaded  
• Fastest Response  
• Weighted Selection  
• Priority Routing

Fallback System

• Provider Fallback  
• Model Fallback  
• Capability Fallback  
• Retry Strategy  
• Failure Recovery  
• Graceful Degradation

Retry Management

• Retry Policy  
• Retry Limits  
• Backoff Strategy  
• Timeout Recovery  
• Provider Recovery

Routing Policies

• Cost First  
• Speed First  
• Quality First  
• Local First  
• Privacy First  
• Custom Policies

Constraints

• GPU Availability  
• CPU Availability  
• Memory Limits  
• Token Limits  
• Context Limits  
• Licensing Constraints

Caching

• Route Cache  
• Provider Cache  
• Capability Cache  
• Selection Cache

Health Integration

• Provider Health Awareness  
• Model Health Awareness  
• Route Availability  
• Failure Detection

Events

• RouteSelected  
• ProviderSelected  
• ModelSelected  
• RoutingFailed  
• RetryStarted  
• RetryCompleted  
• FallbackActivated  
• RouteCompleted

Diagnostics

• Routing Trace  
• Decision Report  
• Performance Metrics  
• Provider Comparison  
• Route Statistics

Documentation

• Routing Architecture  
• Routing Policies  
• Routing Decision Flow  
• Fallback Strategy  
• Routing Extension Guide

RULES

Never redesign.

Never hardcode provider names.

Never hardcode model names.

Every routing decision must be driven by metadata and capabilities.

The router must never directly execute inference.

The router only decides where execution should occur.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Runtime execution  
• Memory  
• Knowledge  
• Agents  
• API  
• CLI  
• Business modules

Only implement the reusable Routing System.

DEFINITION OF DONE

• Router operational  
• Model selection operational  
• Provider selection operational  
• Capability routing operational  
• Load balancing operational  
• Fallback operational  
• Retry management operational  
• Routing diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Routing System components  
2\. Files created  
3\. Files modified  
4\. Remaining Routing System work

Stop immediately after Phase 06 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 07 — Runtime System.

OBJECTIVE

Build the execution engine responsible for orchestrating every AI request from start to finish.

The Runtime System coordinates all platform components but owns no provider-specific or model-specific logic.

SCOPE

Runtime Core

• Runtime Manager  
• Runtime Bootstrap  
• Runtime Registry  
• Runtime Context  
• Runtime Configuration  
• Runtime State Manager

Execution Engine

• Execution Manager  
• Execution Pipeline  
• Execution Context  
• Execution Metadata  
• Execution Lifecycle  
• Execution Cancellation  
• Execution Recovery

Session Runtime

• Session Manager  
• Session Registry  
• Session Context  
• Session Lifecycle  
• Session Isolation  
• Session Cleanup

Conversation Runtime

• Conversation Runtime  
• Conversation State  
• Conversation Lifecycle  
• Context Injection  
• History Integration

Request Runtime

• Request Manager  
• Request Queue  
• Request Validation  
• Request Scheduling  
• Request Tracking  
• Request Cancellation

Streaming Runtime

• Stream Manager  
• Stream Controller  
• Stream Events  
• Stream Recovery  
• Stream Completion  
• Stream Cancellation

Task Runtime

• Task Manager  
• Background Tasks  
• Scheduled Tasks  
• Deferred Tasks  
• Task Recovery

Scheduler

• Execution Scheduler  
• Queue Scheduler  
• Priority Scheduler  
• Resource Scheduler  
• Worker Scheduler

Resource Management

• CPU Allocation  
• GPU Allocation  
• Memory Monitoring  
• Resource Limits  
• Resource Cleanup

Context Management

• Runtime Context  
• Execution Context  
• Session Context  
• Conversation Context  
• Shared Context

State Management

• Runtime States  
• Execution States  
• Session States  
• Request States  
• Recovery States

Timeout Management

• Request Timeout  
• Execution Timeout  
• Stream Timeout  
• Cleanup Timeout

Recovery

• Failure Recovery  
• Session Recovery  
• Runtime Restart  
• Pipeline Recovery  
• Resource Recovery

Observability

• Runtime Metrics  
• Execution Metrics  
• Performance Metrics  
• Runtime Tracing  
• Resource Usage

Events

• RuntimeStarted  
• RuntimeStopped  
• ExecutionStarted  
• ExecutionCompleted  
• ExecutionFailed  
• SessionCreated  
• SessionClosed  
• StreamStarted  
• StreamCompleted  
• RuntimeRecovered

Diagnostics

• Runtime Health  
• Execution Reports  
• Performance Reports  
• Resource Reports  
• Failure Reports

Documentation

• Runtime Architecture  
• Execution Pipeline  
• Runtime Lifecycle  
• Scheduler Documentation  
• Recovery Documentation

RULES

Never redesign.

Never implement provider-specific logic.

Never implement model-specific logic.

Never bypass the Routing System.

Every execution must flow through the Runtime.

The Runtime coordinates execution but delegates provider/model decisions to the Routing System.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Memory System  
• Knowledge System  
• Agent System  
• API  
• CLI  
• Business modules

Only implement the reusable Runtime System.

DEFINITION OF DONE

• Runtime boots successfully  
• Execution pipeline operational  
• Session runtime operational  
• Conversation runtime operational  
• Streaming runtime operational  
• Scheduler operational  
• Recovery operational  
• Runtime diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Runtime System components  
2\. Files created  
3\. Files modified  
4\. Remaining Runtime System work

Stop immediately after Phase 07 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 08 — Memory System.

OBJECTIVE

Build a provider-independent memory platform that enables the AI to retain, retrieve, organize, summarize, and evolve information across requests, sessions, conversations, projects, and long-term usage.

The Memory System stores knowledge.  
It never performs inference.

SCOPE

Memory Core

• Memory Manager  
• Memory Registry  
• Memory Configuration  
• Memory Context  
• Memory Metadata  
• Memory Lifecycle

Memory Types

• Working Memory  
• Conversation Memory  
• Session Memory  
• Project Memory  
• Long-Term Memory  
• Semantic Memory  
• Episodic Memory  
• Temporary Memory

Memory Storage

• Memory Repository  
• Memory Persistence  
• Memory Serialization  
• Memory Versioning  
• Memory Cleanup

Memory Organization

• Memory Collections  
• Memory Categories  
• Memory Tags  
• Memory Relationships  
• Memory References

Memory Retrieval

• Memory Search  
• Semantic Search  
• Keyword Search  
• Similarity Search  
• Hybrid Search  
• Memory Ranking

Memory Indexing

• Memory Index  
• Vector Index  
• Keyword Index  
• Metadata Index  
• Incremental Index Updates

Memory Processing

• Memory Compression  
• Memory Consolidation  
• Memory Deduplication  
• Memory Summarization  
• Memory Prioritization

Context Integration

• Context Retrieval  
• Context Assembly  
• Context Injection  
• Token Budget Management  
• Context Compression

Memory Lifecycle

• Memory Creation  
• Memory Update  
• Memory Merge  
• Memory Archive  
• Memory Expiration  
• Memory Deletion

Memory Policies

• Retention Policies  
• Privacy Policies  
• Project Isolation  
• Session Isolation  
• User Isolation

Caching

• Memory Cache  
• Retrieval Cache  
• Context Cache  
• Summary Cache

Health

• Memory Health  
• Index Health  
• Storage Health  
• Retrieval Metrics  
• Cache Metrics

Events

• MemoryCreated  
• MemoryUpdated  
• MemoryMerged  
• MemoryArchived  
• MemoryRetrieved  
• MemoryIndexed  
• MemoryDeleted  
• MemoryExpired

Diagnostics

• Memory Statistics  
• Storage Statistics  
• Retrieval Performance  
• Index Performance  
• Memory Growth  
• Cache Performance

Documentation

• Memory Architecture  
• Memory Lifecycle  
• Retrieval Flow  
• Index Design  
• Retention Policies

RULES

Never redesign.

Never couple memory to any provider.

Never couple memory to any model.

Every memory must have metadata.

Every memory must be retrievable.

Memory must be reusable by Runtime, Chat, Agents, and Knowledge systems.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Knowledge System  
• Agent System  
• API  
• CLI  
• Business modules

Only implement the reusable Memory System.

DEFINITION OF DONE

• Memory Manager operational  
• Memory storage operational  
• Memory retrieval operational  
• Memory indexing operational  
• Context integration operational  
• Memory lifecycle operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Memory System components  
2\. Files created  
3\. Files modified  
4\. Remaining Memory System work

Stop immediately after Phase 08 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 09 — Knowledge System.

OBJECTIVE

Build a provider-independent Knowledge System that transforms raw documents and data into searchable, structured knowledge usable by every platform component.

The Knowledge System is responsible for ingestion, processing, indexing, retrieval, and lifecycle management.

The Knowledge System never performs inference.

SCOPE

Knowledge Core

• Knowledge Manager  
• Knowledge Registry  
• Knowledge Configuration  
• Knowledge Metadata  
• Knowledge Context  
• Knowledge Lifecycle

Knowledge Sources

• Local Files  
• Markdown  
• PDF  
• DOCX  
• TXT  
• HTML  
• JSON  
• CSV  
• Images  
• Audio  
• Video  
• Future Connectors

Knowledge Repository

• Repository Manager  
• Repository Metadata  
• Repository Versioning  
• Repository Synchronization  
• Repository Validation

Document Processing

• Document Loader  
• Content Extraction  
• OCR Integration  
• Metadata Extraction  
• Language Detection  
• Duplicate Detection

Chunking

• Chunk Manager  
• Chunk Strategies  
• Chunk Metadata  
• Chunk Relationships  
• Incremental Chunk Updates

Embeddings

• Embedding Interface  
• Embedding Pipeline  
• Embedding Storage  
• Embedding Updates  
• Embedding Validation

Knowledge Indexing

• Vector Index  
• Keyword Index  
• Metadata Index  
• Hybrid Index  
• Incremental Index Updates

Knowledge Retrieval

• Semantic Search  
• Keyword Search  
• Hybrid Search  
• Similarity Search  
• Metadata Filtering  
• Ranking

Knowledge Organization

• Collections  
• Categories  
• Tags  
• Relationships  
• References  
• Projects  
• Workspaces

Knowledge Synchronization

• Incremental Sync  
• Full Sync  
• Change Detection  
• Version Tracking  
• Conflict Resolution

Knowledge Policies

• Retention Policies  
• Access Policies  
• Privacy Policies  
• Project Isolation  
• User Isolation

Caching

• Document Cache  
• Chunk Cache  
• Retrieval Cache  
• Embedding Cache

Health

• Repository Health  
• Index Health  
• Embedding Health  
• Retrieval Health  
• Processing Metrics

Events

• KnowledgeImported  
• KnowledgeUpdated  
• KnowledgeIndexed  
• KnowledgeRemoved  
• RepositorySynced  
• RetrievalCompleted  
• EmbeddingsGenerated  
• KnowledgeValidated

Diagnostics

• Repository Statistics  
• Index Statistics  
• Retrieval Performance  
• Embedding Performance  
• Storage Usage  
• Synchronization Reports

Documentation

• Knowledge Architecture  
• Repository Design  
• Processing Pipeline  
• Chunking Strategy  
• Retrieval Flow  
• Synchronization Guide

RULES

Never redesign.

Never couple the Knowledge System to any provider.

Never couple the Knowledge System to any model.

Every document must retain metadata.

Every chunk must be traceable to its source.

Knowledge must be reusable by Runtime, Memory, Agents, API, and future modules.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Agent System  
• API  
• CLI  
• Business modules

Only implement the reusable Knowledge System.

DEFINITION OF DONE

• Knowledge Manager operational  
• Repository operational  
• Document ingestion operational  
• Processing pipeline operational  
• Chunking operational  
• Embeddings operational  
• Indexing operational  
• Retrieval operational  
• Synchronization operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Knowledge System components  
2\. Files created  
3\. Files modified  
4\. Remaining Knowledge System work

Stop immediately after Phase 09 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 10 — Agent System.

OBJECTIVE

Build a provider-independent Agent System capable of planning, reasoning, orchestrating tools, managing workflows, and completing complex multi-step tasks.

The Agent System coordinates intelligence.  
It never owns provider execution or model management.

SCOPE

Agent Core

• Agent Manager  
• Agent Registry  
• Agent Configuration  
• Agent Metadata  
• Agent Context  
• Agent Lifecycle

Agent Types

• Chat Agent  
• Assistant Agent  
• Workflow Agent  
• Planning Agent  
• Task Agent  
• Automation Agent  
• Custom Agents

Agent Profiles

• Agent Identity  
• Agent Role  
• Agent Objectives  
• Agent Capabilities  
• Agent Constraints  
• Agent Permissions

Planning Engine

• Goal Analysis  
• Task Planning  
• Step Generation  
• Dependency Analysis  
• Execution Planning  
• Plan Revision

Reasoning Engine

• Chain of Thought Abstraction  
• Reflection  
• Verification  
• Decision Making  
• Multi-Step Reasoning  
• Failure Analysis

Task Management

• Task Manager  
• Task Queue  
• Task Scheduling  
• Task Prioritization  
• Task Cancellation  
• Task Recovery

Workflow Engine

• Workflow Manager  
• Workflow Definition  
• Workflow Execution  
• Conditional Branching  
• Parallel Execution  
• Sequential Execution

Tool Integration

• Tool Discovery  
• Tool Registry  
• Tool Selection  
• Tool Invocation  
• Tool Validation  
• Tool Permissions

Memory Integration

• Working Memory Access  
• Long-Term Memory Access  
• Context Retrieval  
• Context Updates  
• Memory Synchronization

Knowledge Integration

• Knowledge Search  
• Knowledge Retrieval  
• Knowledge Injection  
• Source Attribution

Runtime Integration

• Runtime Coordination  
• Request Execution  
• Streaming Support  
• Session Management

State Management

• Agent State  
• Workflow State  
• Task State  
• Planning State  
• Execution State

Policies

• Permission Policies  
• Safety Policies  
• Resource Policies  
• Execution Policies  
• Isolation Policies

Observability

• Agent Metrics  
• Workflow Metrics  
• Task Metrics  
• Tool Metrics  
• Planning Metrics

Events

• AgentCreated  
• AgentStarted  
• AgentStopped  
• PlanGenerated  
• WorkflowStarted  
• WorkflowCompleted  
• ToolInvoked  
• TaskCompleted  
• TaskFailed

Diagnostics

• Agent Health  
• Workflow Reports  
• Planning Reports  
• Tool Reports  
• Execution Reports

Documentation

• Agent Architecture  
• Planning Engine  
• Workflow Engine  
• Tool Integration Guide  
• Agent Development Guide

RULES

Never redesign.

Never hardcode provider-specific logic.

Never hardcode model-specific logic.

Agents must use the Runtime System for execution.

Agents must use the Routing System for provider/model selection.

Agents must use the Memory System for context.

Agents must use the Knowledge System for retrieval.

Agents must never bypass platform abstractions.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• API  
• CLI  
• UI  
• Business modules

Only implement the reusable Agent System.

DEFINITION OF DONE

• Agent Manager operational  
• Planning engine operational  
• Reasoning engine operational  
• Workflow engine operational  
• Tool integration operational  
• Memory integration operational  
• Knowledge integration operational  
• Runtime integration operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Agent System components  
2\. Files created  
3\. Files modified  
4\. Remaining Agent System work

Stop immediately after Phase 10 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 11 — Tool System.

OBJECTIVE

Build a provider-independent Tool System that allows every agent, workflow, runtime, and future module to discover, validate, execute, monitor, and manage tools through a unified interface.

The Tool System owns tool execution.  
It never performs model inference.

SCOPE

Tool Core

• Tool Manager  
• Tool Registry  
• Tool Configuration  
• Tool Metadata  
• Tool Context  
• Tool Lifecycle

Tool Definition

• Tool Interface  
• Tool Manifest  
• Tool Schema  
• Tool Parameters  
• Tool Responses  
• Tool Categories  
• Tool Capabilities

Tool Discovery

• Automatic Discovery  
• Manifest Discovery  
• Dynamic Registration  
• Static Registration  
• Version Detection

Tool Execution

• Tool Executor  
• Execution Context  
• Parameter Validation  
• Result Validation  
• Execution Lifecycle  
• Execution Isolation  
• Execution Cancellation

Tool Types

• Internal Tools  
• Platform Tools  
• System Tools  
• File Tools  
• Network Tools  
• AI Tools  
• Custom Tools  
• Plugin Tools

Permissions

• Permission Manager  
• Permission Policies  
• Allow Lists  
• Deny Lists  
• Approval Workflow  
• Sandboxed Execution

Input Validation

• JSON Schema Validation  
• Type Validation  
• Required Parameters  
• Default Values  
• Custom Validators

Output Validation

• Response Validation  
• Type Validation  
• Error Normalization  
• Metadata Generation

Execution Policies

• Retry Policies  
• Timeout Policies  
• Rate Limits  
• Concurrency Limits  
• Resource Limits

Tool Chaining

• Sequential Execution  
• Parallel Execution  
• Conditional Execution  
• Dependency Resolution  
• Shared Context

Caching

• Tool Cache  
• Result Cache  
• Manifest Cache  
• Validation Cache

Monitoring

• Tool Metrics  
• Execution Metrics  
• Performance Metrics  
• Error Metrics  
• Usage Metrics

Health

• Tool Health  
• Availability  
• Failure Detection  
• Recovery Status

Events

• ToolRegistered  
• ToolLoaded  
• ToolExecuted  
• ToolCompleted  
• ToolFailed  
• ToolReloaded  
• PermissionGranted  
• PermissionDenied

Diagnostics

• Execution Reports  
• Performance Reports  
• Error Reports  
• Usage Reports  
• Health Reports

Documentation

• Tool Architecture  
• Tool SDK  
• Tool Manifest Specification  
• Tool Development Guide  
• Permission Guide

RULES

Never redesign.

Never hardcode provider-specific logic.

Every tool must implement the shared Tool Interface.

Every tool must declare a manifest and schema.

Every tool must validate inputs and outputs.

Tool execution must be isolated from Runtime and Agent implementations.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• API  
• CLI  
• UI  
• Business modules

Only implement the reusable Tool System.

DEFINITION OF DONE

• Tool Manager operational  
• Tool Registry operational  
• Tool discovery operational  
• Tool execution operational  
• Validation operational  
• Permission system operational  
• Tool chaining operational  
• Monitoring operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Tool System components  
2\. Files created  
3\. Files modified  
4\. Remaining Tool System work

Stop immediately after Phase 11 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 12 — API System.

OBJECTIVE

Build a provider-independent API platform that exposes every platform capability through stable, versioned, secure, and extensible interfaces.

The API System exposes platform services.  
It never contains business logic.

SCOPE

API Core

• API Manager  
• API Registry  
• API Configuration  
• API Lifecycle  
• API Metadata  
• API Context

API Architecture

• REST API  
• Streaming API  
• WebSocket API  
• Event API  
• Internal API  
• Extension API

Versioning

• Version Manager  
• API Compatibility  
• Version Routing  
• Deprecation Policies  
• Migration Support

Routing

• Route Registry  
• Route Discovery  
• Route Validation  
• Route Groups  
• Route Middleware  
• Route Metadata

Request Pipeline

• Request Parser  
• Request Validation  
• Context Builder  
• Authentication  
• Authorization  
• Request Lifecycle

Response Pipeline

• Response Builder  
• Error Normalization  
• Metadata Injection  
• Pagination  
• Streaming Responses

Serialization

• JSON Serialization  
• Binary Serialization  
• Streaming Serialization  
• Content Negotiation

Authentication

• API Keys  
• JWT  
• Bearer Tokens  
• Session Authentication  
• Local Authentication  
• Future Authentication Providers

Authorization

• Role-Based Access  
• Permission Policies  
• Resource Policies  
• Scope Validation

Middleware

• Logging  
• Metrics  
• Request IDs  
• CORS  
• Compression  
• Rate Limiting  
• Security Headers

Streaming

• SSE  
• Chunked Responses  
• Streaming Events  
• Stream Recovery  
• Stream Cancellation

API Resources

• Models  
• Providers  
• Runtime  
• Sessions  
• Conversations  
• Memory  
• Knowledge  
• Agents  
• Tools  
• Health  
• Metrics

OpenAPI

• OpenAPI Generator  
• Schema Generation  
• Endpoint Documentation  
• Client SDK Metadata

Health

• Health Endpoints  
• Readiness  
• Liveness  
• Metrics  
• Diagnostics

Monitoring

• API Metrics  
• Request Metrics  
• Latency Metrics  
• Error Metrics  
• Usage Metrics

Events

• APIStarted  
• APIStopped  
• RequestReceived  
• RequestCompleted  
• RequestFailed  
• AuthenticationSucceeded  
• AuthenticationFailed  
• RouteRegistered

Diagnostics

• API Reports  
• Performance Reports  
• Error Reports  
• Traffic Reports  
• Health Reports

Documentation

• API Architecture  
• Endpoint Documentation  
• OpenAPI Specification  
• Authentication Guide  
• Extension Guide

RULES

Never redesign.

Never place business logic inside controllers.

Controllers must delegate to platform services.

Every endpoint must use shared validation.

Every endpoint must use shared error handling.

Every endpoint must use shared response formatting.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• CLI  
• UI  
• Business modules

Only implement the reusable API System.

DEFINITION OF DONE

• API Manager operational  
• REST API operational  
• Streaming API operational  
• WebSocket infrastructure operational  
• Authentication operational  
• Authorization operational  
• Middleware operational  
• OpenAPI generation operational  
• Health endpoints operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed API System components  
2\. Files created  
3\. Files modified  
4\. Remaining API System work

Stop immediately after Phase 12 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 13 — CLI System.

OBJECTIVE

Build a modern, extensible, cross-platform Command Line Interface that exposes every platform capability through a consistent command architecture.

The CLI System is only a presentation layer.

It must never contain business logic.

Every command must delegate to the underlying platform services.

SCOPE

CLI Core

• CLI Manager  
• CLI Registry  
• CLI Bootstrap  
• CLI Configuration  
• CLI Lifecycle  
• CLI Context

Command System

• Command Registry  
• Command Discovery  
• Command Metadata  
• Command Categories  
• Command Aliases  
• Command Validation

Command Execution

• Command Parser  
• Argument Parser  
• Option Parser  
• Flag Parser  
• Command Dispatcher  
• Command Pipeline

Input

• Interactive Input  
• Non-interactive Input  
• Prompt System  
• Multi-line Input  
• Confirmation Prompts  
• Secret Input

Output

• Console Renderer  
• Rich Text  
• Tables  
• Trees  
• Progress Bars  
• Spinners  
• Markdown Output  
• JSON Output  
• YAML Output  
• Plain Text Output

Shell Experience

• Auto Completion  
• Command Suggestions  
• Help Generator  
• Usage Generator  
• Examples  
• Shell Integration

Sessions

• CLI Session Manager  
• Session Context  
• Session History  
• Command History  
• Persistent History

Profiles

• User Profiles  
• Workspace Profiles  
• Environment Profiles  
• Configuration Profiles

Configuration

• Config Files  
• Environment Variables  
• Runtime Overrides  
• User Preferences  
• Workspace Configuration

CLI Resources

• Models  
• Providers  
• Runtime  
• Sessions  
• Conversations  
• Memory  
• Knowledge  
• Agents  
• Tools  
• Plugins  
• System

Developer Experience

• Debug Mode  
• Verbose Mode  
• Trace Mode  
• Dry Run  
• Profiling  
• Diagnostics

Error Handling

• Validation Errors  
• Usage Errors  
• Runtime Errors  
• Recovery Suggestions  
• Exit Codes

Events

• CLIStarted  
• CLIStopped  
• CommandRegistered  
• CommandExecuted  
• CommandCompleted  
• CommandFailed  
• SessionStarted  
• SessionEnded

Diagnostics

• CLI Health  
• Command Statistics  
• Startup Metrics  
• Performance Reports  
• Configuration Reports

Documentation

• CLI Architecture  
• Command Reference  
• Command Development Guide  
• Configuration Guide  
• Shell Integration Guide

RULES

Never redesign.

Never place business logic inside commands.

Commands must delegate to platform services.

Every command must use shared validation.

Every command must use shared error handling.

Every command must use shared output formatting.

Support Linux, macOS, and Windows.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Desktop UI  
• Web UI  
• Mobile UI  
• Business modules

Only implement the reusable CLI System.

DEFINITION OF DONE

• CLI Manager operational  
• Command Registry operational  
• Command execution operational  
• Interactive prompts operational  
• Output rendering operational  
• Shell completion operational  
• Configuration operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed CLI System components  
2\. Files created  
3\. Files modified  
4\. Remaining CLI System work

Stop immediately after Phase 13 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 14 — Plugin System.

OBJECTIVE

Build a secure, extensible Plugin System that enables third-party and first-party extensions to integrate with the platform without modifying the core codebase.

The Plugin System owns plugin discovery, lifecycle, isolation, permissions, compatibility, and communication.

It must never contain business logic.

SCOPE

Plugin Core

• Plugin Manager  
• Plugin Registry  
• Plugin Configuration  
• Plugin Metadata  
• Plugin Manifest  
• Plugin Context  
• Plugin Lifecycle

Plugin Discovery

• Local Discovery  
• Installed Plugin Discovery  
• Workspace Plugin Discovery  
• Dynamic Discovery  
• Manifest Validation

Plugin Installation

• Install Manager  
• Update Manager  
• Uninstall Manager  
• Enable Manager  
• Disable Manager  
• Rollback Manager

Plugin Loading

• Loader  
• Dependency Resolution  
• Version Resolution  
• Initialization  
• Lazy Loading  
• Hot Reloading

Plugin Isolation

• Sandboxed Execution  
• Resource Isolation  
• Process Isolation  
• Permission Isolation  
• Configuration Isolation

Plugin Permissions

• File Access  
• Network Access  
• Runtime Access  
• Tool Access  
• Memory Access  
• Knowledge Access  
• API Access  
• CLI Access

Plugin SDK

• Plugin Interface  
• Lifecycle Hooks  
• Service Registration  
• Event Registration  
• Command Registration  
• API Registration  
• Tool Registration

Extension Points

• Runtime Extensions  
• Provider Extensions  
• Router Extensions  
• Model Extensions  
• Agent Extensions  
• Tool Extensions  
• API Extensions  
• CLI Extensions  
• UI Extensions  
• Workflow Extensions

Dependency Management

• Dependency Graph  
• Version Compatibility  
• Conflict Detection  
• Circular Dependency Detection  
• Optional Dependencies

Communication

• Event Bus Integration  
• Service Discovery  
• Shared Context  
• Plugin Messaging  
• Plugin RPC

Validation

• Manifest Validation  
• Signature Validation  
• Compatibility Validation  
• Dependency Validation  
• Permission Validation

Marketplace Preparation

• Package Metadata  
• Version Metadata  
• Publisher Metadata  
• Update Metadata  
• Integrity Metadata

Health

• Plugin Health  
• Startup Health  
• Runtime Health  
• Resource Usage  
• Failure Detection

Caching

• Manifest Cache  
• Plugin Cache  
• Dependency Cache  
• Metadata Cache

Events

• PluginDiscovered  
• PluginInstalled  
• PluginUpdated  
• PluginEnabled  
• PluginDisabled  
• PluginLoaded  
• PluginUnloaded  
• PluginFailed

Diagnostics

• Plugin Reports  
• Dependency Reports  
• Compatibility Reports  
• Performance Reports  
• Health Reports

Documentation

• Plugin Architecture  
• Plugin SDK  
• Manifest Specification  
• Plugin Development Guide  
• Extension Point Guide

RULES

Never redesign.

Never hardcode plugin behavior.

Every plugin must implement the shared Plugin Interface.

Every plugin must provide a valid manifest.

Every plugin must declare permissions explicitly.

Plugins must never access platform internals directly.

Plugins must communicate only through approved extension points, services, events, or SDK interfaces.

Support safe hot-loading and unloading without restarting the platform whenever possible.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Desktop UI  
• Web UI  
• Mobile UI  
• Business modules  
• Plugin Marketplace frontend

Only implement the reusable Plugin System.

DEFINITION OF DONE

• Plugin Manager operational  
• Plugin Registry operational  
• Discovery operational  
• Installation operational  
• Loading operational  
• Isolation operational  
• Permission system operational  
• Extension points operational  
• SDK operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Plugin System components  
2\. Files created  
3\. Files modified  
4\. Remaining Plugin System work

Stop immediately after Phase 14 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 15 — Observability & Monitoring System.

OBJECTIVE

Build a unified Observability and Monitoring System that provides complete visibility into every component of the platform through structured logging, metrics, tracing, diagnostics, health monitoring, auditing, and alerting.

The Observability System observes platform behavior.

It never owns business logic.

SCOPE

Observability Core

• Observability Manager  
• Observability Registry  
• Observability Configuration  
• Observability Context  
• Observability Lifecycle

Logging

• Structured Logging  
• Log Manager  
• Log Levels  
• Log Categories  
• Contextual Logging  
• Correlation IDs  
• Log Rotation  
• Log Retention  
• Log Export

Metrics

• Metrics Manager  
• Counter Metrics  
• Gauge Metrics  
• Histogram Metrics  
• Timer Metrics  
• Custom Metrics  
• Resource Metrics

Tracing

• Trace Manager  
• Distributed Tracing  
• Request Tracing  
• Execution Tracing  
• Tool Tracing  
• Agent Tracing  
• Runtime Tracing  
• Provider Tracing

Health Monitoring

• Health Manager  
• Health Checks  
• Readiness Checks  
• Liveness Checks  
• Dependency Health  
• Component Health  
• System Health

Diagnostics

• Diagnostic Manager  
• Diagnostic Reports  
• Runtime Diagnostics  
• Memory Diagnostics  
• Performance Diagnostics  
• Failure Diagnostics  
• Recovery Diagnostics

Performance Monitoring

• Latency Monitoring  
• Throughput Monitoring  
• Queue Monitoring  
• Execution Monitoring  
• Startup Monitoring  
• Shutdown Monitoring

Resource Monitoring

• CPU Usage  
• GPU Usage  
• RAM Usage  
• Disk Usage  
• Network Usage  
• Thread Usage  
• Process Monitoring

Audit System

• Audit Manager  
• Audit Events  
• Audit Trails  
• Change History  
• Configuration Changes  
• Security Events

Alerting

• Alert Manager  
• Threshold Rules  
• Health Alerts  
• Failure Alerts  
• Resource Alerts  
• Performance Alerts  
• Custom Alerts

Monitoring Integration

• Runtime Monitoring  
• Provider Monitoring  
• Model Monitoring  
• Router Monitoring  
• Memory Monitoring  
• Knowledge Monitoring  
• Agent Monitoring  
• Tool Monitoring  
• API Monitoring  
• CLI Monitoring  
• Plugin Monitoring

Exporters

• Console Exporter  
• JSON Exporter  
• File Exporter  
• Future External Exporters

Events

• HealthChanged  
• AlertTriggered  
• AlertResolved  
• MetricRecorded  
• TraceStarted  
• TraceCompleted  
• DiagnosticGenerated  
• AuditRecorded

Documentation

• Observability Architecture  
• Logging Guide  
• Metrics Guide  
• Tracing Guide  
• Health Guide  
• Diagnostics Guide  
• Audit Guide

RULES

Never redesign.

Never mix observability code with business logic.

Every platform component must expose metrics.

Every request must support correlation IDs.

Every error must produce structured diagnostics.

Every critical lifecycle event must be observable.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Desktop UI  
• Web UI  
• Mobile UI  
• Business modules  
• External monitoring dashboards

Only implement the reusable Observability & Monitoring System.

DEFINITION OF DONE

• Observability Manager operational  
• Structured logging operational  
• Metrics operational  
• Tracing operational  
• Health monitoring operational  
• Diagnostics operational  
• Audit system operational  
• Alerting operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Observability & Monitoring System components  
2\. Files created  
3\. Files modified  
4\. Remaining Observability & Monitoring System work

Stop immediately after Phase 15 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 16 — Security System.

OBJECTIVE

Build a comprehensive Security System that protects every layer of the platform through authentication, authorization, encryption, secret management, validation, auditing, sandboxing, and policy enforcement.

The Security System provides platform-wide protection.

It never contains business logic.

SCOPE

Security Core

• Security Manager  
• Security Registry  
• Security Configuration  
• Security Context  
• Security Lifecycle

Identity

• Identity Manager  
• User Identity  
• Service Identity  
• Plugin Identity  
• Agent Identity  
• Session Identity

Authentication

• Authentication Manager  
• Local Authentication  
• API Key Authentication  
• Bearer Authentication  
• JWT Authentication  
• Session Authentication  
• Multi-Factor Authentication Framework  
• Authentication Providers

Authorization

• Authorization Manager  
• Role-Based Access Control  
• Permission-Based Access  
• Resource Policies  
• Scope Validation  
• Context-Aware Authorization

Secrets Management

• Secret Manager  
• Secret Storage  
• Secret Encryption  
• Secret Rotation  
• Secret Validation  
• Environment Secret Integration

Encryption

• Encryption Manager  
• Data Encryption  
• File Encryption  
• Secret Encryption  
• Transport Encryption  
• Key Management

Validation

• Input Validation  
• Output Validation  
• Schema Validation  
• Configuration Validation  
• Manifest Validation

Sandboxing

• Plugin Sandboxing  
• Tool Sandboxing  
• Process Isolation  
• Filesystem Restrictions  
• Network Restrictions  
• Resource Limits

Security Policies

• Access Policies  
• Execution Policies  
• Resource Policies  
• Data Policies  
• Privacy Policies  
• Trust Policies

Threat Protection

• Rate Limiting  
• Abuse Detection  
• Replay Protection  
• CSRF Protection Framework  
• Injection Prevention  
• Request Validation

Audit & Compliance

• Security Audit Manager  
• Authentication Audit  
• Authorization Audit  
• Secret Audit  
• Configuration Audit  
• Compliance Reports

Security Monitoring

• Security Metrics  
• Authentication Metrics  
• Authorization Metrics  
• Threat Metrics  
• Security Health

Incident Management

• Security Alerts  
• Threat Detection  
• Incident Logging  
• Incident Recovery  
• Incident Reports

Events

• AuthenticationSucceeded  
• AuthenticationFailed  
• AuthorizationGranted  
• AuthorizationDenied  
• SecretCreated  
• SecretRotated  
• SecurityAlertRaised  
• SecurityPolicyViolated

Documentation

• Security Architecture  
• Authentication Guide  
• Authorization Guide  
• Secret Management Guide  
• Security Policy Guide  
• Compliance Guide

RULES

Never redesign.

Never hardcode credentials.

Never store secrets in source code.

Every sensitive operation must require authorization.

Every secret must be encrypted at rest.

Every external request must be validated.

Every plugin and tool must operate within enforced security policies.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Desktop UI  
• Web UI  
• Mobile UI  
• Business modules  
• External Identity Providers

Only implement the reusable Security System.

DEFINITION OF DONE

• Security Manager operational  
• Authentication operational  
• Authorization operational  
• Secret management operational  
• Encryption operational  
• Validation operational  
• Sandboxing operational  
• Threat protection operational  
• Security auditing operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Security System components  
2\. Files created  
3\. Files modified  
4\. Remaining Security System work

Stop immediately after Phase 16 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 17 — Testing & Quality System.

OBJECTIVE

Build a comprehensive Testing & Quality System that validates every platform component through automated testing, quality gates, validation pipelines, performance testing, compatibility testing, and continuous quality assurance.

The Testing & Quality System verifies platform correctness.

It never contains business logic.

SCOPE

Testing Core

• Testing Manager  
• Testing Registry  
• Testing Configuration  
• Testing Context  
• Testing Lifecycle

Unit Testing

• Test Framework  
• Test Discovery  
• Test Runner  
• Assertions  
• Mock Framework  
• Fixture Management  
• Test Isolation

Integration Testing

• Component Integration Tests  
• Service Integration Tests  
• API Integration Tests  
• Provider Integration Tests  
• Runtime Integration Tests  
• Database Integration Tests

End-to-End Testing

• Workflow Testing  
• CLI Testing  
• API Testing  
• Runtime Testing  
• Agent Testing  
• Tool Testing

Contract Testing

• Interface Validation  
• API Contract Tests  
• Provider Contract Tests  
• Plugin Contract Tests  
• SDK Contract Tests

Performance Testing

• Load Testing  
• Stress Testing  
• Throughput Testing  
• Latency Testing  
• Startup Benchmarking  
• Memory Benchmarking

Compatibility Testing

• Cross Platform Testing  
• Configuration Testing  
• Version Compatibility  
• Plugin Compatibility  
• Provider Compatibility

Validation

• Schema Validation  
• Configuration Validation  
• Manifest Validation  
• Data Validation  
• Metadata Validation

Quality Gates

• Build Validation  
• Type Validation  
• Lint Validation  
• Test Coverage Validation  
• Documentation Validation  
• Dependency Validation

Coverage

• Unit Coverage  
• Integration Coverage  
• Branch Coverage  
• Statement Coverage  
• Mutation Coverage (Framework Ready)

Static Analysis

• Linting  
• Type Analysis  
• Dead Code Detection  
• Dependency Analysis  
• Security Analysis

Regression Testing

• Regression Suite  
• Snapshot Testing  
• Golden Tests  
• Compatibility Regression

Test Infrastructure

• Test Utilities  
• Mock Services  
• Fake Providers  
• Fake Runtime  
• Fake Storage  
• Test Data Generators

Reporting

• Test Reports  
• Coverage Reports  
• Performance Reports  
• Regression Reports  
• Quality Reports

Events

• TestStarted  
• TestCompleted  
• TestFailed  
• CoverageGenerated  
• QualityGatePassed  
• QualityGateFailed  
• BenchmarkCompleted  
• ValidationCompleted

Documentation

• Testing Architecture  
• Testing Guide  
• Test Development Guide  
• Coverage Guide  
• Quality Gate Guide  
• CI Testing Guide

RULES

Never redesign.

Every public interface must have automated tests.

Every platform component must be independently testable.

Every bug fix must include regression tests.

Every new feature must include unit and integration tests where applicable.

Quality gates must block invalid builds.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Business module tests  
• UI tests  
• External cloud testing infrastructure

Only implement the reusable Testing & Quality System.

DEFINITION OF DONE

• Testing Manager operational  
• Unit testing infrastructure operational  
• Integration testing operational  
• End-to-end testing operational  
• Contract testing operational  
• Performance testing operational  
• Quality gates operational  
• Coverage reporting operational  
• Static analysis operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Testing & Quality System components  
2\. Files created  
3\. Files modified  
4\. Remaining Testing & Quality System work

Stop immediately after Phase 17 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 18 — Deployment & Release System.

OBJECTIVE

Build a production-grade Deployment & Release System that automates building, packaging, versioning, publishing, deployment, rollback, and release management across all supported platforms.

The Deployment System delivers the platform.

It never contains business logic.

SCOPE

Deployment Core

• Deployment Manager  
• Deployment Registry  
• Deployment Configuration  
• Deployment Context  
• Deployment Lifecycle

Build System

• Build Manager  
• Build Profiles  
• Development Builds  
• Production Builds  
• Debug Builds  
• Release Builds

Packaging

• Package Manager  
• Platform Packages  
• Archive Generation  
• Binary Packaging  
• Manifest Packaging  
• Checksum Generation

Versioning

• Semantic Versioning  
• Build Numbers  
• Version Metadata  
• Compatibility Matrix  
• Release Channels

Release Management

• Release Manager  
• Release Pipeline  
• Stable Releases  
• Beta Releases  
• Alpha Releases  
• Nightly Builds

Artifact Management

• Artifact Registry  
• Artifact Metadata  
• Artifact Validation  
• Artifact Signing  
• Artifact Retention

Deployment Targets

• Local Installation  
• Linux  
• Windows  
• macOS  
• Container Preparation  
• Future Cloud Targets

Installation

• Installer Framework  
• Upgrade Manager  
• Migration Manager  
• Rollback Manager  
• Uninstall Manager

Configuration

• Environment Profiles  
• Build Configuration  
• Deployment Configuration  
• Runtime Configuration  
• Secrets Integration

Validation

• Build Validation  
• Package Validation  
• Dependency Validation  
• Compatibility Validation  
• Installation Validation

Release Automation

• Automated Builds  
• Automated Packaging  
• Automated Validation  
• Automated Publishing  
• Automated Release Notes

Rollback

• Version Rollback  
• Configuration Rollback  
• Deployment Recovery  
• Release Recovery

Monitoring

• Build Metrics  
• Deployment Metrics  
• Installation Metrics  
• Release Metrics  
• Failure Metrics

Events

• BuildStarted  
• BuildCompleted  
• BuildFailed  
• PackageCreated  
• ReleaseCreated  
• ReleasePublished  
• DeploymentCompleted  
• RollbackCompleted

Diagnostics

• Build Reports  
• Release Reports  
• Deployment Reports  
• Compatibility Reports  
• Failure Reports

Documentation

• Deployment Architecture  
• Build Guide  
• Release Guide  
• Packaging Guide  
• Rollback Guide  
• Versioning Guide

RULES

Never redesign.

Never hardcode platform-specific deployment logic into the core.

Every deployment target must implement shared deployment interfaces.

Every release artifact must be validated and signed.

Every release must be reproducible.

Support Linux, Windows, and macOS.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Business module deployment  
• SaaS deployment  
• Cloud orchestration  
• Production infrastructure provisioning

Only implement the reusable Deployment & Release System.

DEFINITION OF DONE

• Deployment Manager operational  
• Build system operational  
• Packaging operational  
• Versioning operational  
• Release pipeline operational  
• Installation framework operational  
• Rollback operational  
• Validation operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Deployment & Release System components  
2\. Files created  
3\. Files modified  
4\. Remaining Deployment & Release System work

Stop immediately after Phase 18 is fully complete.

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 19 — Documentation & Developer Experience System.

OBJECTIVE

Build a comprehensive Documentation & Developer Experience (DX) System that makes the platform easy to understand, develop, extend, maintain, and contribute to throughout its lifecycle.

The Documentation & DX System supports developers.

It never contains business logic.

SCOPE

Documentation Core

• Documentation Manager  
• Documentation Registry  
• Documentation Configuration  
• Documentation Lifecycle  
• Documentation Metadata

Architecture Documentation

• System Architecture  
• Component Architecture  
• Package Architecture  
• Dependency Graph  
• Data Flow  
• Execution Flow  
• Extension Architecture

API Documentation

• API Reference  
• OpenAPI Documentation  
• SDK Documentation  
• Examples  
• Version History  
• Migration Guides

Developer Guides

• Getting Started  
• Development Setup  
• Local Development  
• Coding Standards  
• Repository Structure  
• Contribution Guide

Component Documentation

• Foundation  
• Platform  
• Database  
• Models  
• Providers  
• Router  
• Runtime  
• Memory  
• Knowledge  
• Agents  
• Tools  
• API  
• CLI  
• Plugins  
• Security  
• Observability  
• Testing  
• Deployment

SDK Documentation

• Public Interfaces  
• Extension APIs  
• Plugin SDK  
• Tool SDK  
• Provider SDK  
• Agent SDK

Examples

• Basic Examples  
• Advanced Examples  
• Integration Examples  
• Plugin Examples  
• Provider Examples  
• CLI Examples  
• API Examples

Developer Tooling

• Project Generators  
• Templates  
• Code Scaffolding  
• Documentation Generators  
• Code Samples

Code Quality

• Formatting Standards  
• Naming Standards  
• Package Standards  
• API Standards  
• Documentation Standards

Developer Utilities

• Dev Scripts  
• Build Scripts  
• Debug Utilities  
• Profiling Utilities  
• Development Diagnostics

Migration Support

• Upgrade Guides  
• Breaking Changes  
• Version Compatibility  
• Migration Tools

Validation

• Documentation Validation  
• Link Validation  
• Example Validation  
• API Validation  
• Code Sample Validation

Search

• Documentation Index  
• Search Metadata  
• Cross References  
• Navigation Structure

Events

• DocumentationGenerated  
• DocumentationUpdated  
• ExampleGenerated  
• ValidationCompleted  
• MigrationGuideUpdated

Diagnostics

• Documentation Coverage  
• Missing Documentation Report  
• Broken Links Report  
• Example Validation Report  
• Developer Experience Report

Documentation

• Documentation Architecture  
• Documentation Standards  
• Style Guide  
• Contribution Guide  
• Maintenance Guide

RULES

Never redesign.

Every public package must be documented.

Every exported interface must be documented.

Every extension point must include examples.

Every SDK must include implementation guides.

Documentation must evolve with code.

Examples must compile and remain validated.

Reuse existing documentation whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• Business documentation  
• Marketing documentation  
• End-user manuals  
• Product website

Only implement the reusable Documentation & Developer Experience System.

DEFINITION OF DONE

• Documentation Manager operational  
• Architecture documentation complete  
• API documentation complete  
• SDK documentation complete  
• Developer guides complete  
• Examples validated  
• Documentation validation operational  
• Developer utilities operational  
• Diagnostics operational  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass  
• Documentation updated

OUTPUT

Return only:

1\. Completed Documentation & Developer Experience components  
2\. Files created  
3\. Files modified  
4\. Remaining Documentation & Developer Experience work

Stop immediately after Phase 19 is fully complete

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 20 — Final Platform Integration & Production Readiness.

OBJECTIVE

Integrate every completed platform subsystem into a single, production-ready AI platform.

Validate architecture, eliminate technical debt, ensure consistency across all modules, and prepare the repository for stable production releases.

This phase must not introduce new platform capabilities.

Its purpose is integration, verification, stabilization, optimization, and production readiness.

SCOPE

Platform Integration

• Foundation Integration  
• Platform Core Integration  
• Database Integration  
• Model System Integration  
• Provider System Integration  
• Routing System Integration  
• Runtime Integration  
• Memory Integration  
• Knowledge Integration  
• Agent Integration  
• Tool Integration  
• API Integration  
• CLI Integration  
• Plugin Integration  
• Security Integration  
• Observability Integration  
• Testing Integration  
• Deployment Integration  
• Documentation Integration

Architecture Validation

• Layer Validation  
• Dependency Validation  
• Circular Dependency Detection  
• Package Boundary Validation  
• Interface Consistency  
• Contract Validation

Codebase Cleanup

• Remove Dead Code  
• Remove Duplicate Logic  
• Remove Legacy Code  
• Remove Temporary Files  
• Remove Experimental Code  
• Standardize Naming  
• Standardize Folder Structure  
• Standardize Configuration

Dependency Optimization

• Dependency Cleanup  
• Version Alignment  
• Package Optimization  
• Startup Optimization  
• Build Optimization

Performance Optimization

• Startup Performance  
• Memory Optimization  
• CPU Optimization  
• GPU Optimization  
• Cache Optimization  
• Lazy Loading Optimization  
• Concurrency Optimization

Security Review

• Security Audit  
• Secret Validation  
• Permission Review  
• Authentication Review  
• Authorization Review  
• Dependency Vulnerability Review

Reliability

• Failure Recovery Validation  
• Graceful Shutdown  
• Graceful Startup  
• Resource Cleanup  
• Crash Recovery  
• Fault Tolerance Validation

Production Validation

• Build Validation  
• Lint Validation  
• Type Validation  
• Test Validation  
• Package Validation  
• Installation Validation  
• Upgrade Validation  
• Rollback Validation

Compatibility

• Linux Validation  
• Windows Validation  
• macOS Validation  
• Configuration Compatibility  
• Plugin Compatibility  
• Provider Compatibility

Documentation Finalization

• Architecture Review  
• API Review  
• SDK Review  
• CLI Review  
• Plugin Review  
• Deployment Review  
• Release Notes  
• Changelog

Release Preparation

• Production Configuration  
• Release Artifacts  
• Version Finalization  
• License Verification  
• NOTICE Files  
• Third-Party Attribution  
• Checksums  
• Release Manifest

Quality Gates

• 100% Build Success  
• Lint Success  
• Typecheck Success  
• Test Success  
• Documentation Validation  
• Dependency Validation  
• Security Validation  
• Production Validation

Acceptance Review

Verify that every completed phase integrates correctly:

• Phase 01 — Foundation  
• Phase 02 — Platform Core  
• Phase 03 — Database Foundation  
• Phase 04 — Model System  
• Phase 05 — Provider System  
• Phase 06 — Routing System  
• Phase 07 — Runtime System  
• Phase 08 — Memory System  
• Phase 09 — Knowledge System  
• Phase 10 — Agent System  
• Phase 11 — Tool System  
• Phase 12 — API System  
• Phase 13 — CLI System  
• Phase 14 — Plugin System  
• Phase 15 — Observability & Monitoring  
• Phase 16 — Security System  
• Phase 17 — Testing & Quality  
• Phase 18 — Deployment & Release  
• Phase 19 — Documentation & Developer Experience

RULES

Never redesign.

Never introduce new platform features.

Never break public interfaces.

Preserve backward compatibility wherever documented.

Prefer improving existing implementations over creating new ones.

Before creating anything, verify whether it already exists.

If it exists, improve, optimize, integrate, or validate it instead of recreating it.

Every subsystem must communicate only through documented interfaces.

Every production artifact must be reproducible.

DO NOT IMPLEMENT

• New business modules  
• New experimental features  
• UI redesign  
• Platform rewrites  
• Major architectural changes

Focus only on production readiness.

DEFINITION OF DONE

• Every subsystem integrated  
• Architecture validated  
• Dependency graph validated  
• No circular dependencies  
• No duplicate implementations  
• No dead code  
• Production build successful  
• Lint passes  
• Typecheck passes  
• Full test suite passes  
• Security validation passes  
• Documentation finalized  
• Release artifacts generated  
• Production package validated  
• Repository ready for stable release

OUTPUT

Return only:

1\. Integrated platform components  
2\. Files created  
3\. Files modified  
4\. Validation results  
5\. Remaining production blockers (if any)

Stop immediately after Phase 20 is fully complete..

You are continuing implementation of the current repository.

Before making any changes:

• Read every document under /docs.  
• Read the architecture.  
• Read engineering rules.  
• Read implementation guides.  
• Treat them as the single source of truth.

Do NOT redesign anything.

Implement ONLY Phase 21 — Business Module Framework.

OBJECTIVE

Build the reusable Business Module Framework that allows independent business domains to be developed as plug-and-play modules on top of the completed platform.

This framework defines how business applications integrate with the platform.

It must not implement any specific business domain.

SCOPE

Business Core

• Business Module Manager  
• Business Registry  
• Business Module Interface  
• Business Module Manifest  
• Business Configuration  
• Business Context

Business Lifecycle

• Install  
• Initialize  
• Activate  
• Deactivate  
• Upgrade  
• Uninstall

Business Services

• Service Registration  
• Dependency Resolution  
• Shared Services  
• Cross Module Communication

Business Data

• Module Database Registration  
• Schema Registration  
• Migration Registration  
• Seeder Registration  
• Repository Registration

Business API

• API Registration  
• Route Registration  
• Permissions  
• Versioning

Business CLI

• CLI Command Registration  
• Help Registration  
• Configuration Commands

Business UI Registration

• Navigation Registration  
• Dashboard Registration  
• Widgets  
• Menus  
• Permissions

Business Events

• Event Registration  
• Event Publishing  
• Event Subscription

Business Security

• Roles  
• Permissions  
• Access Policies  
• Data Isolation

Business Configuration

• Module Settings  
• Environment Settings  
• Feature Flags  
• Default Configuration

Business SDK

• Module Base Class  
• Registration Helpers  
• Lifecycle Hooks  
• Extension Helpers

Diagnostics

• Module Health  
• Module Status  
• Dependency Reports  
• Compatibility Reports

Documentation

• Business Module Architecture  
• Module SDK  
• Module Development Guide  
• Module Manifest Specification

RULES

Never redesign.

Never implement business logic.

Never hardcode any business module.

Every business application must use this framework.

Every business module must be installable and removable independently.

Reuse existing implementations whenever possible.

Before creating anything, verify whether it already exists.

If it exists, improve or complete it instead of recreating it.

DO NOT IMPLEMENT

• CRM  
• ERP  
• HRM  
• Finance  
• Dirty2Clean  
• School Management  
• Any business-specific features

Only implement the reusable Business Module Framework.

DEFINITION OF DONE

• Business Module Manager operational  
• Module Registry operational  
• Lifecycle operational  
• API registration operational  
• CLI registration operational  
• UI registration operational  
• Security integration operational  
• Documentation complete  
• Build passes  
• Lint passes  
• Typecheck passes  
• Tests pass

OUTPUT

Return only:

1\. Completed Business Module Framework components  
2\. Files created  
3\. Files modified  
4\. Remaining framework work

Stop immediately after Phase 21 is fully complete.

