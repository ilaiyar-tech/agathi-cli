export interface IConversationEngine {
  /** Process an incoming user message and produce a response */
  handleMessage(sessionId: string, message: string): Promise<string>;
  /** Retrieve conversation history */
  history(sessionId: string, limit?: number): Promise<any[]>;
}
