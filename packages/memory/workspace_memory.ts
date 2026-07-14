import crypto from "node:crypto";
import { memory } from "./memory_engine.js";
import { WorkspaceChunk } from "../context/context_interfaces.js";

function detectMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'text/typescript';
    case 'js': case 'jsx': return 'text/javascript';
    case 'json': return 'application/json';
    case 'md': return 'text/markdown';
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    default: return 'text/plain';
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'typescript';
    case 'js': case 'jsx': return 'javascript';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'html': return 'html';
    case 'css': return 'css';
    default: return 'unknown';
  }
}

export class WorkspaceMemory {
  registerProject(contextId: string, workspaceId: string, agentId?: string): void {
    memory.database.prepare(`
      insert or ignore into contexts (id, owner_id) values (?, ?)
    `).run(contextId, agentId || null);
  }

  indexFile(contextId: string, file: { path: string; content: string; workspaceId?: string; agentId?: string; indexedBy?: string }): void {
    const hash = crypto.createHash("sha256").update(file.content).digest("hex");
    const mimeType = detectMimeType(file.path);
    const language = detectLanguage(file.path);
    const size = Buffer.byteLength(file.content);
    const id = crypto.randomUUID();

    memory.database.prepare(`
      insert into workspace_index (id, context_id, workspace_id, agent_id, type, name, path, content, hash, language, mime_type, size, indexed_by, last_accessed, updated_at)
      values (?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      on conflict(context_id, path) do update set
        content = excluded.content,
        hash = excluded.hash,
        size = excluded.size,
        updated_at = datetime('now')
    `).run(
      id,
      contextId,
      file.workspaceId || null,
      file.agentId || null,
      file.path.split("/").pop() || "",
      file.path,
      file.content,
      hash,
      language,
      mimeType,
      size,
      file.indexedBy || "system"
    );
  }

  removeFile(contextId: string, filePath: string): void {
    memory.database.prepare(`
      delete from workspace_index where context_id = ? and path = ?
    `).run(contextId, filePath);
  }

  getFile(contextId: string, filePath: string): (WorkspaceChunk & { content: string }) | undefined {
    const row: any = memory.database.prepare(`
      select path, content, hash, mime_type as mimeType
      from workspace_index
      where context_id = ? and path = ?
    `).get(contextId, filePath);

    if (!row) return undefined;
    return row;
  }

  hasFileChanged(contextId: string, filePath: string, currentContent: string): boolean {
    const row: any = memory.database.prepare(`
      select hash from workspace_index where context_id = ? and path = ?
    `).get(contextId, filePath);

    if (!row) return true;
    const currentHash = crypto.createHash("sha256").update(currentContent).digest("hex");
    return row.hash !== currentHash;
  }

  searchFiles(contextId: string, query: string): WorkspaceChunk[] {
    const rows: any[] = memory.database.prepare(`
      select path, content, hash, mime_type as mimeType
      from workspace_index
      where context_id = ? and (path like ? or content like ?)
    `).all(contextId, `%${query}%`, `%${query}%`);
    return rows;
  }

  recordBuild(contextId: string, executionId: string, status: "success" | "failed", output?: string, agentId?: string): void {
    memory.database.prepare(`
      insert into build_history (context_id, execution_id, agent_id, status, output)
      values (?, ?, ?, ?, ?)
    `).run(contextId, executionId, agentId || null, status, output || null);
  }

  getBuildHistory(contextId: string): any[] {
    return memory.database.prepare(`
      select execution_id as executionId, agent_id as agentId, status, output, timestamp
      from build_history where context_id = ? order by timestamp desc
    `).all(contextId);
  }

  getWorkspaceStats(contextId: string): { filesCount: number; totalSize: number; languages: Record<string, number> } {
    const files: any[] = memory.database.prepare(`
      select size, language from workspace_index where context_id = ? and type = 'file'
    `).all(contextId);

    const stats = {
      filesCount: files.length,
      totalSize: files.reduce((acc, f) => acc + (f.size || 0), 0),
      languages: {} as Record<string, number>
    };

    for (const f of files) {
      const lang = f.language || "unknown";
      stats.languages[lang] = (stats.languages[lang] || 0) + 1;
    }

    return stats;
  }

  createSnapshot(contextId: string, name: string): void {
    // Delete any existing snapshot with same name in this context
    memory.database.prepare(`
      delete from workspace_snapshots where context_id = ? and snapshot_name = ?
    `).run(contextId, name);

    // Copy from workspace_index to snapshots
    memory.database.prepare(`
      insert into workspace_snapshots (context_id, snapshot_name, path, content, hash)
      select context_id, ?, path, content, hash
      from workspace_index
      where context_id = ? and type = 'file'
    `).run(name, contextId);
  }

  restoreSnapshot(contextId: string, name: string): void {
    const snapshots: any[] = memory.database.prepare(`
      select path, content, hash from workspace_snapshots
      where context_id = ? and snapshot_name = ?
    `).all(contextId, name);

    if (snapshots.length === 0) return;

    // Clear current workspace files for this context
    memory.database.prepare(`
      delete from workspace_index where context_id = ? and type = 'file'
    `).run(contextId);

    // Re-populate from snapshot
    const insert = memory.database.prepare(`
      insert into workspace_index (id, context_id, type, name, path, content, hash, mime_type, language, size, updated_at)
      values (?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const s of snapshots) {
      const mimeType = detectMimeType(s.path);
      const language = detectLanguage(s.path);
      const size = Buffer.byteLength(s.content || "");
      insert.run(crypto.randomUUID(), contextId, s.path.split("/").pop() || "", s.path, s.content, s.hash, mimeType, language, size);
    }
  }

  listSnapshots(contextId: string): string[] {
    const rows: any[] = memory.database.prepare(`
      select distinct snapshot_name from workspace_snapshots where context_id = ?
    `).all(contextId);
    return rows.map(r => r.snapshot_name);
  }

  compareSnapshots(contextId: string, snapshotNameA: string, snapshotNameB: string): { added: string[]; removed: string[]; modified: string[] } {
    const filesA: any[] = memory.database.prepare(`
      select path, hash from workspace_snapshots where context_id = ? and snapshot_name = ?
    `).all(contextId, snapshotNameA);

    const filesB: any[] = memory.database.prepare(`
      select path, hash from workspace_snapshots where context_id = ? and snapshot_name = ?
    `).all(contextId, snapshotNameB);

    const mapA = new Map(filesA.map(f => [f.path, f.hash]));
    const mapB = new Map(filesB.map(f => [f.path, f.hash]));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    for (const [path, hash] of mapB) {
      if (!mapA.has(path)) {
        added.push(path);
      } else if (mapA.get(path) !== hash) {
        modified.push(path);
      }
    }

    for (const [path] of mapA) {
      if (!mapB.has(path)) {
        removed.push(path);
      }
    }

    return { added, removed, modified };
  }
}

export const workspaceMemory = new WorkspaceMemory();
