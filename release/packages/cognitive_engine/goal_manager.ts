import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";

export type GoalStatus = "Created" | "Analyzed" | "Planned" | "Executing" | "Verifying" | "Completed" | "Cancelled" | "Failed" | "Archived";
export type GoalCategory = "Coding" | "Bug Fix" | "Investigation" | "Planning" | "Documentation" | "Website Builder" | "Workspace Management" | "Research" | "Automation" | "Custom";

export interface Goal {
  id: string;
  contextId: string;
  sessionId: string;
  executionId: string;
  parentGoalId?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: GoalStatus;
  category: GoalCategory;
  successCriteria: string[];
  constraints: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GoalDependency {
  goalId: string;
  dependencyGoalId: string;
  type: "blocking" | "child" | "parallel";
}

export class GoalManager {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists goals (
        id text primary key,
        context_id text,
        session_id text,
        execution_id text,
        parent_goal_id text,
        title text,
        description text,
        priority text,
        status text,
        category text,
        success_criteria text,
        constraints text,
        metadata text,
        created_at text,
        updated_at text,
        completed_at text
      );

      create table if not exists goal_dependencies (
        goal_id text,
        dependency_goal_id text,
        type text,
        primary key (goal_id, dependency_goal_id)
      );
    `);
  }

  createGoal(goal: Omit<Goal, "createdAt" | "updatedAt">): Goal {
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const newGoal: Goal = { ...goal, createdAt, updatedAt };

    memory.database.prepare(`
      insert into goals (id, context_id, session_id, execution_id, parent_goal_id, title, description, priority, status, category, success_criteria, constraints, metadata, created_at, updated_at, completed_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newGoal.id,
      newGoal.contextId,
      newGoal.sessionId,
      newGoal.executionId,
      newGoal.parentGoalId || null,
      newGoal.title,
      newGoal.description,
      newGoal.priority,
      newGoal.status,
      newGoal.category,
      JSON.stringify(newGoal.successCriteria),
      JSON.stringify(newGoal.constraints),
      JSON.stringify(newGoal.metadata),
      newGoal.createdAt,
      newGoal.updatedAt,
      newGoal.completedAt || null
    );

    eventBus.publish({
      type: "Custom",
      contextId: newGoal.contextId,
      sessionId: newGoal.sessionId,
      executionId: newGoal.executionId,
      metadata: { event: "GoalCreated", goalId: newGoal.id, category: newGoal.category }
    });

    return newGoal;
  }

  addDependency(dep: GoalDependency) {
    // Detect circular dependency: if dependencyGoalId already depends on goalId, we have a cycle
    const targetDeps = this.getDependenciesForGoal(dep.dependencyGoalId);
    if (targetDeps.includes(dep.goalId) || dep.goalId === dep.dependencyGoalId) {
      throw new Error(`GoalManager: Circular dependency detected for goal '${dep.goalId}'`);
    }

    memory.database.prepare(`
      insert or replace into goal_dependencies (goal_id, dependency_goal_id, type)
      values (?, ?, ?)
    `).run(dep.goalId, dep.dependencyGoalId, dep.type);
  }

  private getDependenciesForGoal(goalId: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(goalId)) return [];
    visited.add(goalId);

    const rows = memory.database.prepare(`
      select dependency_goal_id from goal_dependencies where goal_id = ?
    `).all(goalId) as { dependency_goal_id: string }[];

    const result = rows.map(r => r.dependency_goal_id);
    for (const dep of result) {
      result.push(...this.getDependenciesForGoal(dep, visited));
    }
    return Array.from(new Set(result));
  }

  updateGoal(id: string, updates: Partial<Omit<Goal, "id" | "createdAt" | "updatedAt">>): Goal {
    const existing = this.getGoal(id);
    if (!existing) throw new Error(`Goal ${id} not found`);

    const updatedAt = new Date().toISOString();
    const updated: Goal = { ...existing, ...updates, updatedAt };

    memory.database.prepare(`
      update goals set
        parent_goal_id = ?,
        title = ?,
        description = ?,
        priority = ?,
        status = ?,
        category = ?,
        success_criteria = ?,
        constraints = ?,
        metadata = ?,
        updated_at = ?,
        completed_at = ?
      where id = ?
    `).run(
      updated.parentGoalId || null,
      updated.title,
      updated.description,
      updated.priority,
      updated.status,
      updated.category,
      JSON.stringify(updated.successCriteria),
      JSON.stringify(updated.constraints),
      JSON.stringify(updated.metadata),
      updated.updatedAt,
      updated.completedAt || null,
      id
    );

    eventBus.publish({
      type: "Custom",
      contextId: updated.contextId,
      sessionId: updated.sessionId,
      executionId: updated.executionId,
      metadata: { event: "GoalUpdated", goalId: id, status: updated.status }
    });

    return updated;
  }

  completeGoal(id: string): Goal {
    return this.updateGoal(id, { status: "Completed", completedAt: new Date().toISOString() });
  }

  cancelGoal(id: string): Goal {
    return this.updateGoal(id, { status: "Cancelled" });
  }

  archiveGoal(id: string): Goal {
    return this.updateGoal(id, { status: "Archived" });
  }

  getGoal(id: string): Goal | undefined {
    const row = memory.database.prepare(`select * from goals where id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapRowToGoal(row);
  }

  listGoals(): Goal[] {
    const rows = memory.database.prepare(`select * from goals order by created_at desc`).all() as any[];
    return rows.map(r => this.mapRowToGoal(r));
  }

  searchGoals(query: string): Goal[] {
    const rows = memory.database.prepare(`
      select * from goals 
      where title like ? or description like ?
      order by created_at desc
    `).all(`%${query}%`, `%${query}%`) as any[];
    return rows.map(r => this.mapRowToGoal(r));
  }

  getActiveGoals(): Goal[] {
    const rows = memory.database.prepare(`
      select * from goals where status not in ('Completed', 'Cancelled', 'Failed', 'Archived')
    `).all() as any[];
    return rows.map(r => this.mapRowToGoal(r));
  }

  getGoalTree(rootId: string): Goal[] {
    const tree: Goal[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const goal = this.getGoal(current);
      if (goal) {
        tree.push(goal);
        const children = memory.database.prepare(`
          select id from goals where parent_goal_id = ?
        `).all(current) as { id: string }[];
        queue.push(...children.map(c => c.id));
      }
    }
    return tree;
  }

  evaluateSuccess(id: string): boolean {
    const goal = this.getGoal(id);
    if (!goal) return false;

    // Check dependency status
    const depIds = this.getDependenciesForGoal(id);
    for (const depId of depIds) {
      const dep = this.getGoal(depId);
      if (!dep || dep.status !== "Completed") {
        return false;
      }
    }

    return goal.status === "Completed";
  }

  private mapRowToGoal(row: any): Goal {
    return {
      id: row.id,
      contextId: row.context_id,
      sessionId: row.session_id,
      executionId: row.execution_id,
      parentGoalId: row.parent_goal_id || undefined,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      category: row.category,
      successCriteria: JSON.parse(row.success_criteria || "[]"),
      constraints: JSON.parse(row.constraints || "[]"),
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined
    };
  }
}

export const goalManager = new GoalManager();
