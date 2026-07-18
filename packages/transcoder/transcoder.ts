export interface CIP {
  version: string;
  metadata: {
    compressed_tokens: number;
    actual_tokens: number;
    compression_ratio: string;
    dsl_terms: string[];
  };
  intent: {
    goals: string[];
    constraints: string[];
    context_required: string[];
  };
}

export interface AIRStep {
  id: string;
  name: string;
  action: string;
  params: Record<string, any>;
}

export interface AIR {
  version: string;
  plan: {
    steps: AIRStep[];
  };
}

const TAMIL_DSL_DICTIONARY: Record<string, {
  tamil: string;
  goals: string[];
  constraints: string[];
  context: string[];
  expandedTokens: number;
}> = {
  "vei marul panai thol": {
    tamil: "வேய் மருள் பனை தோள்",
    goals: [
      "Establish robust architectural foundation and schema constraints",
      "Ensure structural integrity and compile-time correctness",
      "Define clean module interfaces and decoupled state management"
    ],
    constraints: [
      "Strict type assertions and zero 'any' usage",
      "Enforce immutable data flows",
      "Compile-time validations using Zod schema models"
    ],
    context: ["project_structure", "tsconfig.json", "package.json"],
    expandedTokens: 25000
  },
  "koodal": {
    tamil: "கூடல்",
    goals: [
      "Assemble components and bind APIs deterministically",
      "Establish event-driven message bus and routing channels",
      "Connect client sidebars to core agent daemon"
    ],
    constraints: [
      "Keep routes REST-compliant and fully documented",
      "Use asynchronous connection pools",
      "Graceful degradation on network partition"
    ],
    context: ["api_gateway", "server_routes", "event_bus"],
    expandedTokens: 18000
  },
  "agazh": {
    tamil: "அகழ்",
    goals: [
      "Deep probe workspace and build Context OS indexing maps",
      "Scan execution logs and identify error stack root causes",
      "Trace dependencies to construct project module tree"
    ],
    constraints: [
      "O(1) directory and module lookups",
      "Avoid memory leaks by closing file handles",
      "Filter out noisy non-relevant build warnings"
    ],
    context: ["context_engine", "git_status", "logs"],
    expandedTokens: 20000
  },
  "seyal": {
    tamil: "செயல்",
    goals: [
      "Execute tasks in safe sandboxed environment",
      "Translate goals into tool parameters and execute tool-calls",
      "Collect and buffer process stdout/stderr stream packages"
    ],
    constraints: [
      "Timeout long running actions after 15000ms",
      "No direct shell escapes; escape inputs safely",
      "Verify command output status code before proceeding"
    ],
    context: ["execution_engine", "terminal_manager", "sandbox"],
    expandedTokens: 22000
  },
  "therivu": {
    tamil: "தெரிவு",
    goals: [
      "Formulate deterministic plan roadmap based on goals",
      "Perform model registry capability checks against requirements",
      "Select optimized reasoning paths using model router"
    ],
    constraints: [
      "Ensure roadmap steps are topologically sorted by dependency",
      "Reject models with insufficient reasoning context",
      "Minimize step redundancy"
    ],
    context: ["prompt_planner", "model_registry", "router"],
    expandedTokens: 15000
  },
  "nirubi": {
    tamil: "நிரூபி",
    goals: [
      "Run trust protocol verification suite",
      "Perform automated self-correction on syntax errors",
      "Generate evidence report detailing before-after changes"
    ],
    constraints: [
      "Execute json-repair automatically on raw JSON outputs",
      "Fallback to premium model if self-correction fails 3 times",
      "Halt execution and alert operator if path is flawed"
    ],
    context: ["validation_engine", "trust_protocol", "history"],
    expandedTokens: 24000
  }
};

export class Transcoder {
  
  static normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  static transcodeTamilToCIP(tamilText: string): CIP {
    const normalized = this.normalizeInput(tamilText);
    const matchedTerms: string[] = [];
    const goals: string[] = [];
    const constraints: string[] = [];
    const context_required: string[] = [];
    let expandedTokens = 0;

    // Check each dictionary entry
    for (const [key, value] of Object.entries(TAMIL_DSL_DICTIONARY)) {
      if (normalized.includes(key) || normalized.includes(value.tamil.toLowerCase())) {
        matchedTerms.push(value.tamil);
        goals.push(...value.goals);
        constraints.push(...value.constraints);
        context_required.push(...value.context);
        expandedTokens += value.expandedTokens;
      }
    }

    // Default case if no terms matched
    if (matchedTerms.length === 0) {
      goals.push(`Custom goal: ${tamilText}`);
      constraints.push("Apply standard linting and formatting rules");
      context_required.push("project_structure");
      expandedTokens = 1000;
      matchedTerms.push("Custom Prompt");
    }

    // Count approximate tokens in input (simple split)
    const actual_tokens = tamilText.split(/\s+/).length * 1.5; // simple heuristic
    const compression_ratio = actual_tokens > 0 
      ? `${(expandedTokens / actual_tokens).toFixed(1)}x`
      : "1.0x";

    return {
      version: "1.0.0",
      metadata: {
        compressed_tokens: expandedTokens,
        actual_tokens: Math.round(actual_tokens),
        compression_ratio,
        dsl_terms: matchedTerms
      },
      intent: {
        goals: Array.from(new Set(goals)),
        constraints: Array.from(new Set(constraints)),
        context_required: Array.from(new Set(context_required))
      }
    };
  }

  static compileCIPToAIR(cip: CIP): AIR {
    const steps: AIRStep[] = [];
    let stepCount = 1;

    // Add Context OS lookup steps based on context_required
    for (const ctx of cip.intent.context_required) {
      steps.push({
        id: `step_${stepCount++}`,
        name: `Context OS: Query metadata index for ${ctx}`,
        action: "context_lookup",
        params: { source: ctx }
      });
    }

    // Add Planning step
    steps.push({
      id: `step_${stepCount++}`,
      name: "Strategy Formulation: Formulate topological task order",
      action: "plan_tasks",
      params: { goals: cip.intent.goals, constraints: cip.intent.constraints }
    });

    // Add execution step for each goal
    for (const goal of cip.intent.goals) {
      steps.push({
        id: `step_${stepCount++}`,
        name: `Execution: Operator execution for - ${goal}`,
        action: "execute_tool",
        params: { target: goal, constraints: cip.intent.constraints }
      });
    }

    // Add Proving/Verification step
    steps.push({
      id: `step_${stepCount++}`,
      name: "Evidence & Verification: Run verification suite & Trust Protocol",
      action: "trust_audit",
      params: { 
        verification: "test-and-lint",
        protocol: ["localized_repair", "self_correction", "model_fallback", "escalation_halt"]
      }
    });

    return {
      version: "1.0.0",
      plan: {
        steps
      }
    };
  }

  static promptCompileAIR(air: AIR, targetModel: 'claude' | 'qwen' | 'gpt'): string {
    if (targetModel === 'claude') {
      let xml = `<instruction_plan version="${air.version}">\n`;
      for (const step of air.plan.steps) {
        xml += `  <step id="${step.id}">\n`;
        xml += `    <name>${step.name}</name>\n`;
        xml += `    <action>${step.action}</action>\n`;
        xml += `    <params>${JSON.stringify(step.params)}</params>\n`;
        xml += `  </step>\n`;
      }
      xml += `</instruction_plan>`;
      return xml;
    } else {
      // Qwen / GPT / Markdown representation
      let md = `# Instruction Plan (v${air.version})\n\n`;
      for (const step of air.plan.steps) {
        md += `## Step ${step.id.split('_')[1]}: ${step.name}\n`;
        md += `- **Action**: ${step.action}\n`;
        md += `- **Params**: \`${JSON.stringify(step.params)}\`\n\n`;
      }
      return md.trim();
    }
  }

  static jsonRepair(jsonStr: string): string {
    let repaired = jsonStr.trim();
    
    // Remove potential markdown code fences wrapping the json
    if (repaired.startsWith("```json")) {
      repaired = repaired.substring(7);
    } else if (repaired.startsWith("```")) {
      repaired = repaired.substring(3);
    }
    if (repaired.endsWith("```")) {
      repaired = repaired.substring(0, repaired.length - 3);
    }
    repaired = repaired.trim();

    // Standard brackets and braces balancing
    const stack: string[] = [];
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }

    // Repair unbalanced endings
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') repaired += '}';
      else if (open === '[') repaired += ']';
    }

    return repaired;
  }

  static async executeTrustProtocol(
    actionFn: () => Promise<any>,
    errorRecoveryFn?: (error: any) => Promise<any>
  ): Promise<{ status: string; output: any; stage: string }> {
    // Stage 1: Localized Repair (Try running the task)
    try {
      const result = await actionFn();
      return { status: "success", output: result, stage: "localized_repair" };
    } catch (error: any) {
      console.log(`[Trust Protocol] Stage 1 failed. Error: ${error.message}`);
      
      // Stage 2: Self-Correction (Try correcting logic or parameters)
      if (errorRecoveryFn) {
        try {
          console.log(`[Trust Protocol] Initiating Stage 2: Self-Correction...`);
          const correctedResult = await errorRecoveryFn(error);
          return { status: "success", output: correctedResult, stage: "self_correction" };
        } catch (correctionError: any) {
          console.log(`[Trust Protocol] Stage 2 failed. Error: ${correctionError.message}`);
        }
      }

      // Stage 3: Model Fallback (Simulate fallback route escalation)
      console.log(`[Trust Protocol] Initiating Stage 3: Model Fallback (Escalating to premium engine)...`);
      try {
        // Run with simulated premium parameters
        const fallbackResult = await actionFn(); 
        return { status: "success", output: fallbackResult, stage: "model_fallback" };
      } catch (fallbackError: any) {
        console.log(`[Trust Protocol] Stage 3 failed. Error: ${fallbackError.message}`);
      }

      // Stage 4: Escalation Halt
      console.log(`[Trust Protocol] Stage 4: Escalation Halt triggered. Operations halted.`);
      return { status: "failed", output: error.message, stage: "escalation_halt" };
    }
  }
}
