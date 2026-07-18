import Database from "better-sqlite3";
import fs from "fs-extra";
import path from "node:path";
import { PATHS } from "../config/index.js";

export class knowledge_engine {
    private database: Database.Database;

    constructor(dbPath: string = "storage/knowledge.db") {
        if (dbPath !== ":memory:") {
            fs.ensureDirSync("storage");
        }
        this.database = new Database(dbPath);
        this.database.exec(`
            create table if not exists documents(
                id integer primary key autoincrement,
                name text not null,
                path text not null unique,
                chunks integer default 0,
                created_at datetime default current_timestamp
            );
        `);
    }

    add_document(name: string, docPath: string, chunks: number = 0): void {
        this.database.prepare(`
            insert into documents(name, path, chunks)
            values(?, ?, ?)
            on conflict(path) do update set 
                name=excluded.name,
                chunks=excluded.chunks
        `).run(name, docPath, chunks);
    }

    delete_document(id: number): void {
        this.database.prepare(`delete from documents where id=?`).run(id);
    }

    list_documents() {
        return this.database.prepare(`
            select * from documents order by id desc
        `).all();
    }

    sync_directory(dirPath: string) {
        if (!fs.existsSync(dirPath)) return;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            if (file.endsWith(".md") || file.endsWith(".txt")) {
                const fullPath = path.join(dirPath, file);
                const content = fs.readFileSync(fullPath, "utf8");
                const chunks = Math.ceil(content.length / 1000); // Dummy chunking
                this.add_document(file, fullPath, chunks);
            }
        }
    }
}

export const knowledge = new knowledge_engine();
