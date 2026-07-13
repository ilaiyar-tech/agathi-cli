import { gateway } from "../api_gateway/index.js";
import { runtime } from "../agent_runtime/index.js";
import { sessions } from "../session_manager/index.js";
import { get_models } from "../provider_manager/index.js";

export class engine_verification {
  async verifySystemReady(): Promise<boolean> {
    try {
      // 1. Session check
      const session = sessions.create_session({ active: true });
      if (!session.id) return false;

      // 2. Models check
      const models = get_models();
      if (!Array.isArray(models)) return false;

      // 3. API Gateway instantiation check
      if (typeof gateway.listen !== "function") return false;

      // 4. Runtime check
      if (typeof runtime.chat !== "function") return false;

      return true;
    } catch (e) {
      return false;
    }
  }
}

export const verifier = new engine_verification();
