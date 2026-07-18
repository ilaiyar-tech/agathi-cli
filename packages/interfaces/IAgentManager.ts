export interface IAgentManager {
  /** Initialize agents and manage their lifecycle */
  startAgent(agentId: string, config?: any): Promise<void>;
  /** Stop an agent */
  stopAgent(agentId: string): Promise<void>;
  /** List active agents */
  listAgents(): Promise<string[]>;
}
