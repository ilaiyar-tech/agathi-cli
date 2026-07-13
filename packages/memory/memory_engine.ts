import Database from "better-sqlite3";
import fs from "fs-extra";

export class memory_engine {
    private database: Database.Database;

    constructor(dbPath: string = "storage/agathi_cli.db") {
        if (dbPath !== ":memory:") {
            fs.ensureDirSync("storage");
        }
        this.database = new Database(dbPath);
        this.database.exec(`
            create table if not exists memory(
                id integer primary key autoincrement,
                session_id text not null,
                role text not null,
                content text not null,
                created_at datetime default current_timestamp
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
