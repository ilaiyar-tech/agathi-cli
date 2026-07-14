import { ExecutionPolicy } from "./execution_policy.js";
import { ResultValidator } from "./result_validator.js";
import { SearchStrategy } from "./search_strategy.js";
import { engine } from "../../execution_engine/index.js";

export class RetryController {
  private policy: ExecutionPolicy;
  private validator: ResultValidator;
  private strategy: SearchStrategy;

  constructor() {
    this.policy = new ExecutionPolicy();
    this.validator = new ResultValidator(this.policy);
    this.strategy = new SearchStrategy();
  }

  public async executeBrowserStrategy(
    originalUrl: string,
    userQuery: string,
    onToken: (token: string) => void
  ): Promise<string> {
    const steps = this.strategy.getSteps(originalUrl);
    let finalResult = "";
    
    // We limit total steps based on execution policy max retries
    const maxAttempts = Math.min(steps.length, this.policy.getMaxRetries() + 1);

    for (let i = 0; i < maxAttempts; i++) {
      const step = steps[i];
      
      // Update CLI state via token bus
      onToken(`\n__TOOL_EVENT__:{"event":"start","tool":"browser_action","args":{"url":"${step.url}"}}\n`);
      onToken(`\n__TOOL_EVENT__:{"event":"validation","message":"Running ${step.name}..."}\n`);

      // Execute search step
      const result = await engine.execute({
        tool: "browser_action",
        args: { action: "extract_text", url: step.url }
      });

      const result_str = typeof result === "string" ? result : JSON.stringify(result);
      onToken(`\n__TOOL_EVENT__:{"event":"end","tool":"browser_action","success":${(result as any).success !== false}}\n`);

      // Result validation & confidence scoring
      onToken(`\n__TOOL_EVENT__:{"event":"validation","message":"Evaluating page relevance..."}\n`);
      const verdict = await this.validator.validate(userQuery, result_str);
      
      onToken(`\n__TOOL_EVENT__:{"event":"validation","message":"Relevance Confidence: ${verdict.score}% - ${verdict.reason}"}\n`);

      if (verdict.isValid) {
        onToken(`\n__TOOL_EVENT__:{"event":"validation","message":"High-confidence match found! Continuing."}\n`);
        return result_str;
      }

      onToken(`\n__TOOL_EVENT__:{"event":"validation","message":"Low-confidence. Rejecting page."}\n`);
      finalResult = `[Result Validator Rejected] The page you visited did not contain relevant information for the user's request (Confidence: ${verdict.score}%). Reason: ${verdict.reason}`;
    }

    // Exhausted strategy
    onToken(`\n__TOOL_EVENT__:{"event":"validation","message":"All search strategies exhausted."}\n`);
    return `[Search Strategy Exhausted] Tried Google, Bing, Maps, and Yelp but could not find a high-confidence match (confidence scores were below ${this.policy.getMinConfidenceScore()}%). Please try a different business name or specify more details.`;
  }
}
export const retryController = new RetryController();
