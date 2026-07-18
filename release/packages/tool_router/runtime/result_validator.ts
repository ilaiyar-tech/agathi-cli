import { ConfidenceScorer, ScoreResult } from "./confidence_scorer.js";
import { ExecutionPolicy } from "./execution_policy.js";

export interface ValidationVerdict {
  isValid: boolean;
  score: number;
  reason: string;
}

export class ResultValidator {
  private scorer: ConfidenceScorer;
  private policy: ExecutionPolicy;

  constructor(policy: ExecutionPolicy) {
    this.scorer = new ConfidenceScorer();
    this.policy = policy;
  }

  public async validate(userQuery: string, pageText: string): Promise<ValidationVerdict> {
    // 1. Heuristic Pre-checks (CAPTCHA, Empty or network error pages)
    const upperText = pageText.toUpperCase();
    if (upperText.includes("OUR SYSTEMS HAVE DETECTED UNUSUAL TRAFFIC") || 
        upperText.includes("CAPTCHA") || 
        upperText.includes("[BROWSER ERROR]") || 
        upperText.includes("SOLVE THE PUZZLE") ||
        upperText.includes("PLEASE VERIFY YOU ARE A HUMAN")) {
      return {
        isValid: false,
        score: 0,
        reason: "Page contains a CAPTCHA challenge or browser error page"
      };
    }

    if (pageText.trim().length < 100) {
      return {
        isValid: false,
        score: 0,
        reason: "Page content is empty or too short to be relevant"
      };
    }

    // 2. LLM Confidence Scorer evaluation
    const scoreResult = await this.scorer.scoreResult(userQuery, pageText);
    const isValid = this.policy.shouldAccept(scoreResult.score);

    return {
      isValid,
      score: scoreResult.score,
      reason: scoreResult.reason
    };
  }
}
