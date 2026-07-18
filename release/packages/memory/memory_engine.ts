import Database from "better-sqlite3";
import fs from "fs-extra";

export class memory_engine {
    public database: Database.Database;

    constructor(dbPath: string = "storage/agathi_cli.db") {
        if (dbPath !== ":memory:") {
            fs.ensureDirSync("storage");
        }
        this.database = new Database(dbPath);
        
        // Setup initial schemas
        this.database.exec(`
            -- Legacy memory table for backwards compatibility
            create table if not exists memory(
                id integer primary key autoincrement,
                session_id text not null,
                role text not null,
                content text not null,
                created_at datetime default current_timestamp
            );

            -- Context OS Schemas
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

            -- Tool Execution Records with full Context OS properties
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
    }

    add(
        session_id:string,
        role:string,
        content:string
    ):void{

        this.database.prepare(`
            insert into memory(
                session_id,
                role,
                content
            )
            values(
                ?,
                ?,
                ?
            )
        `).run(
            session_id,
            role,
            content
        );

    }

    history(
        session_id:string,
        limit:number=20
    ){

        return this.database.prepare(`
            select
                role,
                content,
                created_at
            from memory
            where session_id=?
            order by id desc
            limit ?
        `).all(
            session_id,
            limit
        );

    }

    clear(
        session_id:string
    ){

        this.database.prepare(`
            delete
            from memory
            where session_id=?
        `).run(session_id);

    }

    list(limit:number=200){

        return this.database.prepare(`
            select
                id,
                session_id,
                role as type,
                content,
                created_at
            from memory
            order by id desc
            limit ?
        `).all(limit);

    }

    sessions(){

        return this.database.prepare(`
            select
                session_id,
                count(*) as messages,
                max(created_at) as updated_at
            from memory
            group by session_id
            order by updated_at desc
        `).all();

    }

}

export const memory=new memory_engine();
