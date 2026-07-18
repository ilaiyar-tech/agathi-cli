import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";

export enum SkillCategory {
  ENGINEERING = "ENGINEERING",
  ARCHITECTURE = "ARCHITECTURE",
  OPERATIONS = "OPERATIONS",
  ANALYSIS = "ANALYSIS",
  SECURITY = "SECURITY",
  DEVOPS = "DEVOPS",
  DESIGN = "DESIGN",
  DOCUMENTATION = "DOCUMENTATION",
  TESTING = "TESTING",
  CUSTOM = "CUSTOM"
}

export type SkillId = string;

export interface PlannerPolicy {
  mode: "kahn" | "sequential" | "dynamic";
  maxParallelism: number;
}

export interface ReasoningPolicy {
  mode: "CandidateEvaluation" | "Linear" | "DeepSearch";
  evalDepth: number;
}

export interface StrategyPolicy {
  mode: "Conservative" | "Aggressive" | "RiskAverse";
  riskTolerance: "low" | "medium" | "high";
}

export interface CapabilityPolicy {
  allowedCategories: string[];
  securityLevelLimit: "safe" | "restricted" | "privileged";
}

export interface VerificationPolicy {
  strictness: "Strict" | "Conversational" | "None";
}

export interface ReflectionPolicy {
  depth: "StrictLessons" | "MetricsOnly" | "Skip";
}

export interface OutputPolicy {
  style: "Technical" | "Detailed" | "Concise";
}

export interface SkillPolicy {
  planner: PlannerPolicy;
  reasoning: ReasoningPolicy;
  strategy: StrategyPolicy;
  capabilities: CapabilityPolicy;
  verification: VerificationPolicy;
  reflection: ReflectionPolicy;
  output: OutputPolicy;
}

export interface SkillProfile {
  id: SkillId;
  name: string;
  category: SkillCategory;
  version: string;
  description: string;
  policies: SkillPolicy;
  dependencies: string[];
  inherits?: string;
  tags: string[];
  enabled: boolean;
}

export class SkillRegistry {
  private skills = new Map<SkillId, SkillProfile>();

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists skill_registry (
        id text primary key,
        name text,
        category text,
        version text,
        description text,
        policies text,
        dependencies text,
        inherits text,
        tags text,
        enabled text
      );
    `);
  }

  registerSkill(profile: SkillProfile): void {
    if (this.skills.has(profile.id)) {
      throw new Error(`SkillRegistry: Skill with ID '${profile.id}' is already registered`);
    }

    this.skills.set(profile.id, profile);

    memory.database.prepare(`
      insert or replace into skill_registry (id, name, category, version, description, policies, dependencies, inherits, tags, enabled)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.id,
      profile.name,
      profile.category,
      profile.version,
      profile.description,
      JSON.stringify(profile.policies),
      JSON.stringify(profile.dependencies),
      profile.inherits || null,
      JSON.stringify(profile.tags),
      profile.enabled ? "true" : "false"
    );

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "registry",
      executionId: profile.id,
      metadata: { event: "SkillRegistered", skillId: profile.id }
    });
  }

  unregisterSkill(id: SkillId): void {
    this.skills.delete(id);
    memory.database.prepare(`delete from skill_registry where id = ?`).run(id);

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "registry",
      executionId: id,
      metadata: { event: "SkillUnregistered", skillId: id }
    });
  }

  getSkill(id: SkillId): SkillProfile | undefined {
    return this.skills.get(id);
  }

  listSkills(): SkillProfile[] {
    return Array.from(this.skills.values());
  }

  searchSkills(query: string): SkillProfile[] {
    const lower = query.toLowerCase();
    return this.listSkills().filter(
      s => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower)
    );
  }

  updateSkillStatus(id: SkillId, enabled: boolean): void {
    const skill = this.skills.get(id);
    if (skill) {
      skill.enabled = enabled;
      memory.database.prepare(`
        update skill_registry set enabled = ? where id = ?
      `).run(enabled ? "true" : "false", id);
    }
  }

  clear(): void {
    this.skills.clear();
  }
}

export const skillRegistry = new SkillRegistry();
