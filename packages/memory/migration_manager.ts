import Database from "better-sqlite3";

export interface Migration {
  version: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: "001_initial_core_memory",
    up: (db) => {
      db.exec(`
        create table if not exists memory(
            id integer primary key autoincrement,
            session_id text not null,
            role text not null,
            content text not null,
            created_at datetime default current_timestamp
        );

        create table if not exists contexts (
            id text primary key,
            owner_id text,
            created_at datetime default current_timestamp
        );

        create table if not exists sessions (
            id text primary key,
            context_id text not null,
            agent_id text,
            current_state text not null default 'Task',
            metadata text,
            started_at datetime default current_timestamp,
            ended_at datetime,
            foreign key(context_id) references contexts(id) on delete cascade
        );

        create table if not exists state_history (
            id integer primary key autoincrement,
            session_id text not null,
            execution_id text,
            agent_id text,
            previous_state text,
            current_state text not null,
            transition_reason text,
            timestamp datetime default current_timestamp,
            foreign key(session_id) references sessions(id) on delete cascade
        );

        create table if not exists workspace_index (
            id text primary key,
            context_id text not null,
            workspace_id text,
            agent_id text,
            type text not null,
            name text not null,
            path text not null,
            content text,
            hash text,
            language text,
            mime_type text,
            size integer,
            embedding_id text,
            indexed_by text,
            last_accessed datetime,
            created_at datetime default current_timestamp,
            updated_at datetime default current_timestamp,
            unique(context_id, path),
            foreign key(context_id) references contexts(id) on delete cascade
        );

        create table if not exists build_history (
            id integer primary key autoincrement,
            context_id text not null,
            execution_id text not null,
            agent_id text,
            status text not null,
            output text,
            timestamp datetime default current_timestamp,
            foreign key(context_id) references contexts(id) on delete cascade
        );

        create table if not exists tool_history (
            id integer primary key autoincrement,
            context_id text not null,
            execution_id text not null,
            session_id text not null,
            parent_tool_call_id text,
            agent_id text,
            tool_name text not null,
            args text not null,
            output text,
            success boolean,
            duration_ms integer,
            retry_count integer default 0,
            input_hash text,
            output_hash text,
            tool_version text,
            failure_reason text,
            timeout_reason text,
            cancellation_reason text,
            cache_hit boolean default 0,
            execution_cost real default 0.0,
            token_usage integer default 0,
            artifact_references text,
            produced_files text,
            modified_files text,
            rollback_metadata text,
            timestamp datetime default current_timestamp,
            foreign key(context_id) references contexts(id) on delete cascade
        );

        create table if not exists workspace_snapshots (
            id integer primary key autoincrement,
            context_id text not null,
            snapshot_name text not null,
            path text not null,
            content text,
            hash text,
            timestamp datetime default current_timestamp,
            foreign key(context_id) references contexts(id) on delete cascade
        );
      `);
    },
    down: (db) => {
      db.exec(`
        drop table if exists workspace_snapshots;
        drop table if exists tool_history;
        drop table if exists build_history;
        drop table if exists workspace_index;
        drop table if exists state_history;
        drop table if exists sessions;
        drop table if exists contexts;
        drop table if exists memory;
      `);
    }
  },
  {
    version: "002_agent_orchestration_intelligence",
    up: (db) => {
      db.exec(`
        create table if not exists agent_sessions (
          id text primary key,
          agent_id text not null,
          workflow_id text not null,
          workspace_id text not null,
          execution_id text not null,
          owner text not null,
          status text not null,
          timestamp integer not null
        );

        create table if not exists agent_registry (
          id text primary key,
          name text not null,
          type text not null,
          status text not null
        );

        create table if not exists agent_capabilities (
          agent_id text not null,
          capability text not null,
          primary key (agent_id, capability),
          foreign key(agent_id) references agent_registry(id) on delete cascade
        );

        create table if not exists agent_tasks (
          id text primary key,
          session_id text not null,
          agent_id text not null,
          description text not null,
          status text not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade,
          foreign key(agent_id) references agent_registry(id) on delete cascade
        );

        create table if not exists agent_messages (
          id text primary key,
          session_id text not null,
          sender_id text not null,
          receiver_id text not null,
          content text not null,
          timestamp integer not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_context (
          session_id text primary key,
          context_payload text not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_memory (
          workspace_id text not null,
          key text not null,
          value text not null,
          primary key (workspace_id, key)
        );

        create table if not exists agent_health (
          agent_id text primary key,
          latency integer not null,
          success_rate real not null,
          load real not null,
          availability integer not null,
          foreign key(agent_id) references agent_registry(id) on delete cascade
        );

        create table if not exists agent_events (
          id integer primary key autoincrement,
          session_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_metrics (
          session_id text primary key,
          delegation_latency integer not null,
          communication_latency integer not null,
          collaboration_efficiency real not null,
          agent_utilization real not null,
          task_completion_rate real not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_cache (
          cache_key text primary key,
          value text not null,
          timestamp integer not null
        );

        CREATE TABLE IF NOT EXISTS agent_intelligence_telemetry (
          agent_id TEXT PRIMARY KEY,
          execution_time INTEGER,
          queue_time INTEGER,
          cpu_time INTEGER,
          tool_count INTEGER,
          token_usage INTEGER,
          memory_usage INTEGER,
          retry_count INTEGER,
          success_rate REAL,
          failure_rate REAL
        );
      `);
    },
    down: (db) => {
      db.exec(`
        drop table if exists agent_intelligence_telemetry;
        drop table if exists agent_cache;
        drop table if exists agent_metrics;
        drop table if exists agent_events;
        drop table if exists agent_health;
        drop table if exists agent_memory;
        drop table if exists agent_context;
        drop table if exists agent_messages;
        drop table if exists agent_tasks;
        drop table if exists agent_capabilities;
        drop table if exists agent_registry;
        drop table if exists agent_sessions;
      `);
    }
  },
  {
    version: "003_knowledge_intelligence",
    up: (db) => {
      db.exec(`
        create table if not exists knowledge_sessions (
          id text primary key,
          prompt_id text not null,
          workspace_id text not null,
          execution_id text not null,
          planner_id text not null,
          timestamp integer not null
        );

        create table if not exists knowledge_sources (
          id text primary key,
          type text not null,
          path text not null,
          metadata text not null
        );

        create table if not exists knowledge_indexes (
          id text primary key,
          source_id text not null,
          content text not null,
          indexed_at integer not null,
          expires_at integer,
          foreign key(source_id) references knowledge_sources(id) on delete cascade
        );

        create table if not exists knowledge_evidence (
          id text primary key,
          session_id text not null,
          source_id text not null,
          content text not null,
          trust_score real not null,
          freshness_score real not null,
          citation_ref text not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade,
          foreign key(source_id) references knowledge_sources(id) on delete cascade
        );

        create table if not exists knowledge_rankings (
          id text primary key,
          session_id text not null,
          evidence_id text not null,
          rank_score real not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade,
          foreign key(evidence_id) references knowledge_evidence(id) on delete cascade
        );

        create table if not exists knowledge_cache (
          cache_key text primary key,
          cache_type text not null,
          value text not null,
          timestamp integer not null
        );

        create table if not exists knowledge_timeline (
          id integer primary key autoincrement,
          session_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade
        );

        create table if not exists knowledge_metrics (
          session_id text primary key,
          retrieval_latency integer not null,
          ranking_latency integer not null,
          verification_latency integer not null,
          compression_ratio real not null,
          cache_hit_rate real not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade
        );
      `);
    },
    down: (db) => {
      db.exec(`
        drop table if exists knowledge_metrics;
        drop table if exists knowledge_timeline;
        drop table if exists knowledge_cache;
        drop table if exists knowledge_rankings;
        drop table if exists knowledge_evidence;
        drop table if exists knowledge_indexes;
        drop table if exists knowledge_sources;
        drop table if exists knowledge_sessions;
      `);
    }
  },
  {
    version: "004_execution_intelligence_sandbox",
    up: (db) => {
      db.exec(`
        create table if not exists execution_sessions (
          id text primary key,
          planner_id text not null,
          prompt_id text not null,
          workspace_id text not null,
          session_id text not null,
          created_time integer not null,
          status text not null
        );

        create table if not exists execution_tasks (
          id text primary key,
          execution_id text not null,
          priority integer not null,
          status text not null,
          action text not null,
          result text,
          duration integer,
          timeout integer not null,
          retries integer not null,
          max_retries integer not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists execution_dependencies (
          task_id text not null,
          depends_on_task_id text not null,
          primary key (task_id, depends_on_task_id),
          foreign key(task_id) references execution_tasks(id) on delete cascade
        );

        create table if not exists execution_checkpoints (
          id text primary key,
          execution_id text not null,
          phase text not null,
          state_snapshot text not null,
          timestamp integer not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists execution_events (
          id integer primary key autoincrement,
          execution_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists execution_metrics (
          execution_id text primary key,
          duration integer not null,
          retry_count integer not null,
          failure_count integer not null,
          recovery_count integer not null,
          parallel_efficiency real not null,
          resource_usage text not null,
          success_rate real not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists sandbox_sessions (
          session_id text primary key,
          policy text,
          created_at text,
          active text
        );

        create table if not exists sandbox_audit (
          id text primary key,
          session_id text,
          action text,
          details text,
          timestamp text
        );

        create table if not exists sandbox_statistics (
          metric_name text primary key,
          value real
        );
      `);
    },
    down: (db) => {
      db.exec(`
        drop table if exists sandbox_statistics;
        drop table if exists sandbox_audit;
        drop table if exists sandbox_sessions;
        drop table if exists execution_metrics;
        drop table if exists execution_events;
        drop table if exists execution_checkpoints;
        drop table if exists execution_dependencies;
        drop table if exists execution_tasks;
        drop table if exists execution_sessions;
      `);
    }
  },
  {
    version: "005_accuracy_telemetry",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS accuracy_telemetry (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          type TEXT NOT NULL,
          success INTEGER NOT NULL,
          accuracy_score REAL NOT NULL,
          hallucination_score REAL NOT NULL,
          latency_ms INTEGER NOT NULL
        );
      `);
    },
    down: (db) => {
      db.exec("drop table if exists accuracy_telemetry;");
    }
  }
];

export class MigrationManager {
  initMigrationTable(db: Database.Database): void {
    db.exec(`
      create table if not exists schema_migrations (
        version text primary key,
        applied_at datetime default current_timestamp
      );
    `);
  }

  migrate(db: Database.Database): void {
    this.initMigrationTable(db);

    const appliedRows = db.prepare("select version from schema_migrations").all() as any[];
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`[MigrationManager] Running migration ${migration.version}...`);
        
        // Execute inside transaction for safety
        const runMigration = db.transaction(() => {
          migration.up(db);
          db.prepare("insert into schema_migrations (version) values (?)").run(migration.version);
        });
        
        runMigration();
        console.log(`[MigrationManager] Migration ${migration.version} completed.`);
      }
    }
  }

  rollback(db: Database.Database, version: string): void {
    this.initMigrationTable(db);
    
    const row = db.prepare("select version from schema_migrations where version = ?").get(version);
    if (!row) {
      console.warn(`[MigrationManager] Migration ${version} is not currently applied.`);
      return;
    }

    const migration = MIGRATIONS.find(m => m.version === version);
    if (!migration) {
      throw new Error(`[MigrationManager] Migration profile for ${version} not found.`);
    }

    console.log(`[MigrationManager] Rolling back migration ${version}...`);
    const runRollback = db.transaction(() => {
      migration.down(db);
      db.prepare("delete from schema_migrations where version = ?").run(version);
    });

    runRollback();
    console.log(`[MigrationManager] Rollback for ${version} completed.`);
  }
}

export const migrationManager = new MigrationManager();
