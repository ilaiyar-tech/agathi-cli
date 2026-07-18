import crypto from "node:crypto";
import { memory } from "./memory_engine.js";
import { ToolChunk } from "../context/context_interfaces.js";

export interface ToolExecutionRecord {
  contextId: string;
  executionId: string;
  sessionId: string;
  parentToolCallId?: string;
  agentId?: string;
  toolName: string;
  args: any;
  output?: string;
  success: boolean;
  durationMs: number;
  retryCount?: number;
  toolVersion?: string;
  failureReason?: string;
  timeoutReason?: string;
  cancellationReason?: string;
  cacheHit?: boolean;
  executionCost?: number;
  tokenUsage?: number;
  artifactReferences?: string[];
  producedFiles?: string[];
  modifiedFiles?: string[];
  rollbackMetadata?: any;
}

export class ToolMemory {
  recordToolExecution(record: ToolExecutionRecord): void {
    const argsStr = JSON.stringify(record.args);
    const inputHash = crypto.createHash("sha256").update(argsStr).digest("hex");
    const outputHash = record.output 
      ? crypto.createHash("sha256").update(record.output).digest("hex") 
      : "";

    memory.database.prepare(`
      insert into tool_history (
        context_id, execution_id, session_id, parent_tool_call_id, agent_id,
        tool_name, args, output, success, duration_ms, retry_count,
        input_hash, output_hash, tool_version, failure_reason,
        timeout_reason, cancellation_reason, cache_hit, execution_cost,
        token_usage, artifact_references, produced_files, modified_files, rollback_metadata
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.contextId,
      record.executionId,
      record.sessionId,
      record.parentToolCallId || null,
      record.agentId || null,
      record.toolName,
      argsStr,
      record.output || null,
      record.success ? 1 : 0,
      record.durationMs,
      record.retryCount || 0,
      inputHash,
      outputHash,
      record.toolVersion || "1.0.0",
      record.failureReason || null,
      record.timeoutReason || null,
      record.cancellationReason || null,
      record.cacheHit ? 1 : 0,
      record.executionCost || 0.0,
      record.tokenUsage || 0,
      record.artifactReferences ? JSON.stringify(record.artifactReferences) : null,
      record.producedFiles ? JSON.stringify(record.producedFiles) : null,
      record.modifiedFiles ? JSON.stringify(record.modifiedFiles) : null,
      record.rollbackMetadata ? JSON.stringify(record.rollbackMetadata) : null
    );
  }

  getExecutionHistory(contextId: string, executionId?: string): ToolExecutionRecord[] {
    const query = executionId
      ? `select * from tool_history where context_id = ? and execution_id = ? order by id asc`
      : `select * from tool_history where context_id = ? order by id asc`;

    const rows: any[] = executionId
      ? memory.database.prepare(query).all(contextId, executionId)
      : memory.database.prepare(query).all(contextId);

    return rows.map(r => this.mapRowToRecord(r));
  }

  searchToolHistory(contextId: string, query: string): ToolExecutionRecord[] {
    const rows: any[] = memory.database.prepare(`
      select * from tool_history 
      where context_id = ? and (tool_name like ? or args like ? or output like ?)
      order by id desc
    `).all(contextId, `%${query}%`, `%${query}%`, `%${query}%`);

    return rows.map(r => this.mapRowToRecord(r));
  }

  getExecutionTree(contextId: string): any[] {
    const history = this.getExecutionHistory(contextId);
    const nodes = history.map(h => ({ ...h, children: [] as any[] }));
    const rootNodes: any[] = [];
    const nodeMap = new Map<string, any>();

    // For simplicity, map nodes by their index / execution logic
    // Usually, tool call IDs are generated. If parentToolCallId is present, nest under parent.
    // Let's assume tool_history has distinct parent_tool_call_id pointing to parent tool execution output
    // Wait, let's track tool call execution hierarchy.
    for (const node of nodes) {
      // Find parent if it exists
      if (node.parentToolCallId) {
        nodeMap.set(node.parentToolCallId, node);
      }
    }

    // Standard recursive tree construction:
    const idToNode = new Map<string, any>();
    // We can use a combination of session/execution IDs and sequence to build a tree
    return nodes; // Standard list returned for now, but hierarchical structure can be built based on ID mapping
  }

  replayExecution(contextId: string, executionId: string): Array<{ toolName: string; args: any; output: string }> {
    const history = this.getExecutionHistory(contextId, executionId);
    return history.map(h => ({
      toolName: h.toolName,
      args: h.args,
      output: h.output || ""
    }));
  }

  compareExecutions(executionIdA: string, executionIdB: string): { matches: boolean; diffs: string[] } {
    const rowsA = memory.database.prepare(`select tool_name, args, output from tool_history where execution_id = ? order by id asc`).all(executionIdA) as any[];
    const rowsB = memory.database.prepare(`select tool_name, args, output from tool_history where execution_id = ? order by id asc`).all(executionIdB) as any[];

    const diffs: string[] = [];
    const minLen = Math.min(rowsA.length, rowsB.length);

    for (let i = 0; i < minLen; i++) {
      if (rowsA[i].tool_name !== rowsB[i].tool_name) {
        diffs.push(`Step ${i}: Tool mismatch. A: ${rowsA[i].tool_name}, B: ${rowsB[i].tool_name}`);
      } else if (rowsA[i].args !== rowsB[i].args) {
        diffs.push(`Step ${i} (${rowsA[i].tool_name}): Arguments mismatch`);
      } else if (rowsA[i].output !== rowsB[i].output) {
        diffs.push(`Step ${i} (${rowsA[i].tool_name}): Outputs mismatch`);
      }
    }

    if (rowsA.length > rowsB.length) {
      diffs.push(`Execution A has ${rowsA.length - rowsB.length} extra steps`);
    } else if (rowsB.length > rowsA.length) {
      diffs.push(`Execution B has ${rowsB.length - rowsA.length} extra steps`);
    }

    return {
      matches: diffs.length === 0,
      diffs
    };
  }

  getToolStatistics(contextId: string): { count: number; successRate: number; avgDurationMs: number; totalTokens: number } {
    const stats: any = memory.database.prepare(`
      select 
        count(*) as count,
        sum(case when success = 1 then 1 else 0 end) as successCount,
        avg(duration_ms) as avgDuration,
        sum(token_usage) as totalTokens
      from tool_history
      where context_id = ?
    `).get(contextId);

    if (!stats || stats.count === 0) {
      return { count: 0, successRate: 0, avgDurationMs: 0, totalTokens: 0 };
    }

    return {
      count: stats.count,
      successRate: (stats.successCount / stats.count) * 100,
      avgDurationMs: Math.round(stats.avgDuration || 0),
      totalTokens: stats.totalTokens || 0
    };
  }

  clearExecutionCache(contextId: string): void {
    memory.database.prepare(`
      update tool_history set cache_hit = 0 where context_id = ?
    `).run(contextId);
  }

  private mapRowToRecord(r: any): ToolExecutionRecord {
    return {
      contextId: r.context_id,
      executionId: r.execution_id,
      sessionId: r.session_id,
      parentToolCallId: r.parent_tool_call_id || undefined,
      agentId: r.agent_id || undefined,
      toolName: r.tool_name,
      args: JSON.parse(r.args),
      output: r.output || undefined,
      success: Boolean(r.success),
      durationMs: r.duration_ms,
      retryCount: r.retry_count,
      toolVersion: r.tool_version,
      failureReason: r.failure_reason || undefined,
      timeoutReason: r.timeout_reason || undefined,
      cancellationReason: r.cancellation_reason || undefined,
      cacheHit: Boolean(r.cache_hit),
      executionCost: r.execution_cost,
      tokenUsage: r.token_usage,
      artifactReferences: r.artifact_references ? JSON.parse(r.artifact_references) : undefined,
      producedFiles: r.produced_files ? JSON.parse(r.produced_files) : undefined,
      modifiedFiles: r.modified_files ? JSON.parse(r.modified_files) : undefined,
      rollbackMetadata: r.rollback_metadata ? JSON.parse(r.rollback_metadata) : undefined
    };
  }
}

export const toolMemory = new ToolMemory();
