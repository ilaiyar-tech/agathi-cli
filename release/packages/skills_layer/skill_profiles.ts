import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";
import { SkillProfile, SkillCategory, SkillId } from "./skill_registry.js";

export class SkillProfileManager {
  constructor() {
    this.initDatabase();
    this.registerBuiltInProfiles();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists skill_profiles (
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

      create table if not exists profile_versions (
        profile_id text,
        version text,
        policies text,
        timestamp text,
        primary key (profile_id, version)
      );
    `);
  }

  validateProfile(profile: SkillProfile): void {
    // 1. Policy completeness validation
    if (!profile.policies.planner || !profile.policies.reasoning || !profile.policies.strategy || !profile.policies.capabilities) {
      throw new Error(`SkillProfile '${profile.id}' has incomplete policies`);
    }
    // 2. Inheritance loop validation
    if (profile.inherits) {
      let currentInherited: string | undefined = profile.inherits;
      const seen = new Set<string>([profile.id]);
      while (currentInherited) {
        if (seen.has(currentInherited)) {
          throw new Error(`Circular inheritance chain detected in profile '${profile.id}'`);
        }
        seen.add(currentInherited);
        const inheritedProfile = this.getProfile(currentInherited);
        currentInherited = inheritedProfile?.inherits;
      }
    }
    // 3. Dependency validity check
    for (const dep of profile.dependencies) {
      const depProfile = this.getProfile(dep);
      if (!depProfile) {
        // Warning or loose dependency check
      }
    }

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "profiles",
      executionId: profile.id,
      metadata: { event: "SkillProfileValidated", id: profile.id }
    });
  }

  createProfile(profile: SkillProfile): void {
    this.validateProfile(profile);

    memory.database.prepare(`
      insert or replace into skill_profiles (id, name, category, version, description, policies, dependencies, inherits, tags, enabled)
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

    // Save history version
    memory.database.prepare(`
      insert or replace into profile_versions (profile_id, version, policies, timestamp)
      values (?, ?, ?, ?)
    `).run(profile.id, profile.version, JSON.stringify(profile.policies), new Date().toISOString());

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "profiles",
      executionId: profile.id,
      metadata: { event: "SkillProfileCreated", id: profile.id }
    });
  }

  updateProfile(profile: SkillProfile): void {
    this.validateProfile(profile);

    memory.database.prepare(`
      update skill_profiles set 
        name = ?, category = ?, version = ?, description = ?, policies = ?, dependencies = ?, inherits = ?, tags = ?, enabled = ?
      where id = ?
    `).run(
      profile.name,
      profile.category,
      profile.version,
      profile.description,
      JSON.stringify(profile.policies),
      JSON.stringify(profile.dependencies),
      profile.inherits || null,
      JSON.stringify(profile.tags),
      profile.enabled ? "true" : "false",
      profile.id
    );

    // Save history version
    memory.database.prepare(`
      insert or replace into profile_versions (profile_id, version, policies, timestamp)
      values (?, ?, ?, ?)
    `).run(profile.id, profile.version, JSON.stringify(profile.policies), new Date().toISOString());

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "profiles",
      executionId: profile.id,
      metadata: { event: "SkillProfileUpdated", id: profile.id }
    });
  }

  deleteProfile(id: SkillId): void {
    memory.database.prepare(`delete from skill_profiles where id = ?`).run(id);
    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "profiles",
      executionId: id,
      metadata: { event: "SkillProfileDeleted", id }
    });
  }

  getProfile(id: SkillId): SkillProfile | undefined {
    const row = memory.database.prepare(`select * from skill_profiles where id = ?`).get(id) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      category: row.category as SkillCategory,
      version: row.version,
      description: row.description,
      policies: JSON.parse(row.policies),
      dependencies: JSON.parse(row.dependencies),
      inherits: row.inherits || undefined,
      tags: JSON.parse(row.tags),
      enabled: row.enabled === "true"
    };
  }

  listProfiles(): SkillProfile[] {
    const rows = memory.database.prepare(`select * from skill_profiles`).all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category as SkillCategory,
      version: row.version,
      description: row.description,
      policies: JSON.parse(row.policies),
      dependencies: JSON.parse(row.dependencies),
      inherits: row.inherits || undefined,
      tags: JSON.parse(row.tags),
      enabled: row.enabled === "true"
    }));
  }

  searchProfiles(query: string): SkillProfile[] {
    const lower = query.toLowerCase();
    return this.listProfiles().filter(
      p => p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower)
    );
  }

  registerBuiltInProfiles() {
    const defaultPolicies = (allowed: string[], risk: "low" | "medium" | "high"): SkillProfile["policies"] => ({
      planner: { mode: "kahn", maxParallelism: 2 },
      reasoning: { mode: "DeepSearch", evalDepth: 3 },
      strategy: { mode: "Conservative", riskTolerance: risk },
      capabilities: { allowedCategories: allowed, securityLevelLimit: risk === "high" ? "privileged" : "restricted" },
      verification: { strictness: "Strict" },
      reflection: { depth: "StrictLessons" },
      output: { style: "Technical" }
    });

    const builtIns: SkillProfile[] = [
      {
        id: "software-engineer",
        name: "Software Engineer",
        category: SkillCategory.ENGINEERING,
        version: "1.0.0",
        description: "Standard software development engineer feature coder",
        policies: defaultPolicies(["vcs", "custom"], "medium"),
        dependencies: [],
        tags: ["coder", "engineer"],
        enabled: true
      },
      {
        id: "architect",
        name: "Architect",
        category: SkillCategory.ARCHITECTURE,
        version: "1.0.0",
        description: "Designs system diagrams, database topologies, and plans dependencies",
        policies: defaultPolicies(["custom"], "low"),
        dependencies: [],
        tags: ["design", "arch"],
        enabled: true
      },
      {
        id: "debugger",
        name: "Debugger",
        category: SkillCategory.TESTING,
        version: "1.0.0",
        description: "Analyzes system core dumps, exceptions, and runs bugfixes",
        policies: defaultPolicies(["vcs", "custom"], "high"),
        dependencies: ["software-engineer"],
        tags: ["debug", "testing"],
        enabled: true
      },
      {
        id: "code-reviewer",
        name: "Code Reviewer",
        category: SkillCategory.TESTING,
        version: "1.0.0",
        description: "Analyzes PR files and inspects coding style violations",
        policies: defaultPolicies(["vcs"], "low"),
        dependencies: [],
        tags: ["pr", "review"],
        enabled: true
      },
      {
        id: "security-auditor",
        name: "Security Auditor",
        category: SkillCategory.SECURITY,
        version: "1.0.0",
        description: "Performs workspace credential checks and security risk analyzes",
        policies: defaultPolicies(["vcs", "custom"], "high"),
        dependencies: [],
        tags: ["sec", "audit"],
        enabled: true
      },
      {
        id: "devops-engineer",
        name: "DevOps Engineer",
        category: SkillCategory.DEVOPS,
        version: "1.0.0",
        description: "Orchestrates build containers, deployments, and SSH server configs",
        policies: defaultPolicies(["cloud", "container", "custom"], "high"),
        dependencies: [],
        tags: ["ci", "cd", "docker"],
        enabled: true
      },
      {
        id: "database-engineer",
        name: "Database Engineer",
        category: SkillCategory.ENGINEERING,
        version: "1.0.0",
        description: "Optimizes DB indexes and constructs schemas topologies",
        policies: defaultPolicies(["db", "custom"], "medium"),
        dependencies: [],
        tags: ["sql", "db"],
        enabled: true
      },
      {
        id: "ui-designer",
        name: "UI Designer",
        category: SkillCategory.DESIGN,
        version: "1.0.0",
        description: "Develops client CSS components and interactive layouts",
        policies: defaultPolicies(["custom"], "low"),
        dependencies: [],
        tags: ["ui", "css"],
        enabled: true
      },
      {
        id: "technical-writer",
        name: "Technical Writer",
        category: SkillCategory.DOCUMENTATION,
        version: "1.0.0",
        description: "Drafts deployment guides, API references, and manuals",
        policies: defaultPolicies(["custom"], "low"),
        dependencies: [],
        tags: ["doc", "docs"],
        enabled: true
      },
      {
        id: "research-analyst",
        name: "Research Analyst",
        category: SkillCategory.ANALYSIS,
        version: "1.0.0",
        description: "Compiles external references and benchmarks competitors",
        policies: defaultPolicies(["custom"], "low"),
        dependencies: [],
        tags: ["research", "search"],
        enabled: true
      }
    ];

    for (const builtIn of builtIns) {
      this.createProfile(builtIn);
    }
  }
}

export const skillProfileManager = new SkillProfileManager();
