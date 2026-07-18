import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";
import { SkillProfile, SkillPolicy, SkillId } from "./skill_registry.js";
import { skillProfileManager } from "./skill_profiles.js";

export class SkillPolicyEngine {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists policy_resolution_history (
        resolution_id text primary key,
        profile_id text,
        resolved_policy text,
        timestamp text
      );

      create table if not exists policy_statistics (
        metric_name text primary key,
        value real
      );
    `);
  }

  resolvePolicies(profileId: SkillId, composedIds: SkillId[] = []): SkillPolicy {
    const resolutionId = `res-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "policy_engine",
      executionId: resolutionId,
      metadata: { event: "PolicyResolutionStarted", profileId }
    });

    const activeProfile = skillProfileManager.getProfile(profileId);
    if (!activeProfile) {
      throw new Error(`SkillPolicyEngine: Profile '${profileId}' not found`);
    }

    // 1. Resolve inheritance chain
    let resolved = this.resolveInheritanceChain(activeProfile);

    // 2. Resolve compositions
    for (const composedId of composedIds) {
      const compProfile = skillProfileManager.getProfile(composedId);
      if (compProfile) {
        resolved = this.mergePolicies(resolved, compProfile.policies);
      }
    }

    this.validatePolicies(resolved);
    this.normalizePolicies(resolved);

    // Save resolution logs
    memory.database.prepare(`
      insert into policy_resolution_history (resolution_id, profile_id, resolved_policy, timestamp)
      values (?, ?, ?, ?)
    `).run(resolutionId, profileId, JSON.stringify(resolved), timestamp);

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "policy_engine",
      executionId: resolutionId,
      metadata: { event: "PolicyResolved", profileId, resolvedPolicy: resolved }
    });

    return resolved;
  }

  private resolveInheritanceChain(profile: SkillProfile): SkillPolicy {
    const chain: SkillProfile[] = [profile];
    let current = profile;

    while (current.inherits) {
      const parent = skillProfileManager.getProfile(current.inherits);
      if (!parent) break;
      chain.unshift(parent); // Parent goes first so child overrides it
      current = parent;
    }

    let resolved = chain[0].policies;
    for (let i = 1; i < chain.length; i++) {
      resolved = this.mergePolicies(resolved, chain[i].policies);
    }
    return resolved;
  }

  mergePolicies(parent: SkillPolicy, child: SkillPolicy): SkillPolicy {
    this.detectConflicts(parent, child);

    return {
      planner: { ...parent.planner, ...child.planner },
      reasoning: { ...parent.reasoning, ...child.reasoning },
      strategy: { ...parent.strategy, ...child.strategy },
      capabilities: {
        allowedCategories: Array.from(new Set([...parent.capabilities.allowedCategories, ...child.capabilities.allowedCategories])),
        securityLevelLimit: child.capabilities.securityLevelLimit || parent.capabilities.securityLevelLimit
      },
      verification: { ...parent.verification, ...child.verification },
      reflection: { ...parent.reflection, ...child.reflection },
      output: { ...parent.output, ...child.output }
    };
  }

  detectConflicts(p1: SkillPolicy, p2: SkillPolicy): void {
    if (p1.planner.mode !== p2.planner.mode) {
      eventBus.publish({
        type: "Custom",
        contextId: "skills",
        sessionId: "policy_engine",
        executionId: "conflict",
        metadata: { event: "PolicyConflictDetected", details: `Conflicting planner mode override: ${p1.planner.mode} vs ${p2.planner.mode}` }
      });
    }
  }

  validatePolicies(policy: SkillPolicy): void {
    if (!policy.planner.mode || !policy.reasoning.mode || !policy.strategy.mode) {
      eventBus.publish({
        type: "Custom",
        contextId: "skills",
        sessionId: "policy_engine",
        executionId: "validation_failed",
        metadata: { event: "PolicyValidationFailed" }
      });
      throw new Error(`SkillPolicyEngine: Incomplete policies resolved`);
    }
  }

  normalizePolicies(policy: SkillPolicy): void {
    // Normalization ensures limits stay bounded
    if (policy.planner.maxParallelism < 1) {
      policy.planner.maxParallelism = 1;
    }
  }
}

export const skillPolicyEngine = new SkillPolicyEngine();
