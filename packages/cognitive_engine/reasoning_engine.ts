export interface StructuredObservation {
  contextId: string;
  sessionId: string;
  goal: string;
  workspaceState: string;
  lastToolOutput?: string;
  plannerStatus: string;
}

export interface AnalysisReport {
  missingInfo: string[];
  risks: string[];
  constraints: string[];
  dependencies: string[];
  conflicts: string[];
  confidenceScore: number;
}

export interface HypothesisNode {
  id: string;
  description: string;
  assumptions: string[];
  confidence: number;
  requiredEvidence: string[];
  expectedOutcome: string;
}

export interface ExecutionIntent {
  strategy: string;
  steps: string[];
  targetFiles: string[];
}

export interface VerificationIntent {
  assertions: string[];
  requiredEvidenceFiles: string[];
}

export interface ReflectionContext {
  observationsCount: number;
  initialConfidence: number;
  selectedHypothesisId: string;
  analyzedRisks: string[];
}

export interface ReasoningResult {
  observation: StructuredObservation;
  analysis: AnalysisReport;
  hypotheses: HypothesisNode[];
  selectedHypothesis: HypothesisNode;
  executionIntent: ExecutionIntent;
  verificationIntent: VerificationIntent;
  reflectionContext: ReflectionContext;
  confidence: number;
  reasoningTimeMs: number;
}

export class ReasoningEngine {
  observe(contextId: string, sessionId: string, goal: string, lastToolOutput?: string): StructuredObservation {
    return {
      contextId,
      sessionId,
      goal,
      workspaceState: "detected_active_workspace",
      lastToolOutput,
      plannerStatus: "active"
    };
  }

  analyze(obs: StructuredObservation): AnalysisReport {
    const missingInfo: string[] = [];
    const risks: string[] = [];
    const constraints: string[] = [];
    
    const goalLower = obs.goal.toLowerCase();
    if (goalLower.includes("build") || goalLower.includes("create")) {
      risks.push("potential_code_syntax_errors");
    }
    if (goalLower.includes("server") || goalLower.includes("listen")) {
      constraints.push("port_binding_permissions");
    }

    let confidenceScore = 0.9;
    if (risks.length > 0) confidenceScore -= 0.15 * risks.length;

    return {
      missingInfo,
      risks,
      constraints,
      dependencies: [],
      conflicts: [],
      confidenceScore: Math.max(0.1, confidenceScore)
    };
  }

  generateHypotheses(obs: StructuredObservation, analysis: AnalysisReport): HypothesisNode[] {
    const list: HypothesisNode[] = [];
    const goalLower = obs.goal.toLowerCase();

    if (goalLower.includes("server")) {
      list.push({
        id: "hyp-express-node",
        description: "Set up a standard Node.js Express server",
        assumptions: ["Node.js is installed", "port is free"],
        confidence: 0.85,
        requiredEvidence: ["package.json contains express", "server process runs"],
        expectedOutcome: "HTTP server responds with 200 OK"
      });
      list.push({
        id: "hyp-http-native",
        description: "Set up a native Node.js HTTP server module",
        assumptions: ["No external libraries required"],
        confidence: 0.75,
        requiredEvidence: ["server process runs without node_modules dependency"],
        expectedOutcome: "HTTP server responds with 200 OK"
      });
    } else {
      list.push({
        id: "hyp-direct-execution",
        description: "Direct code generation and execution mapping",
        assumptions: ["dependencies are available"],
        confidence: 0.90,
        requiredEvidence: ["file compiles successfully"],
        expectedOutcome: "All assertions evaluate to true"
      });
    }

    return list;
  }

  selectHypothesis(hypotheses: HypothesisNode[]): HypothesisNode {
    if (hypotheses.length === 0) {
      throw new Error("ReasoningEngine: Cannot select hypothesis from empty list");
    }
    // Select highest confidence hypothesis
    return [...hypotheses].sort((a, b) => b.confidence - a.confidence)[0];
  }

  buildExecutionIntent(hyp: HypothesisNode): ExecutionIntent {
    return {
      strategy: hyp.id,
      steps: [
        `Initialize setup for: ${hyp.description}`,
        "Validate workspace environment assumptions",
        "Implement target modifications"
      ],
      targetFiles: []
    };
  }

  buildVerificationIntent(hyp: HypothesisNode): VerificationIntent {
    return {
      assertions: hyp.requiredEvidence,
      requiredEvidenceFiles: []
    };
  }

  buildReflectionContext(obs: StructuredObservation, analysis: AnalysisReport, hyp: HypothesisNode): ReflectionContext {
    return {
      observationsCount: obs.lastToolOutput ? 2 : 1,
      initialConfidence: hyp.confidence,
      selectedHypothesisId: hyp.id,
      analyzedRisks: analysis.risks
    };
  }

  reason(contextId: string, sessionId: string, goal: string, lastToolOutput?: string): ReasoningResult {
    const startTime = Date.now();

    const observation = this.observe(contextId, sessionId, goal, lastToolOutput);
    const analysis = this.analyze(observation);
    const hypotheses = this.generateHypotheses(observation, analysis);
    const selectedHypothesis = this.selectHypothesis(hypotheses);

    const executionIntent = this.buildExecutionIntent(selectedHypothesis);
    const verificationIntent = this.buildVerificationIntent(selectedHypothesis);
    const reflectionContext = this.buildReflectionContext(observation, analysis, selectedHypothesis);

    return {
      observation,
      analysis,
      hypotheses,
      selectedHypothesis,
      executionIntent,
      verificationIntent,
      reflectionContext,
      confidence: selectedHypothesis.confidence,
      reasoningTimeMs: Date.now() - startTime
    };
  }
}

export const reasoningEngine = new ReasoningEngine();
