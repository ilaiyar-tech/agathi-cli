export interface IStreamingEngine {
  /** Stream response chunks to the caller */
  stream(sessionId: string, prompt: string, onChunk: (chunk: string) => void): Promise<void>;
  /** Cancel an ongoing stream */
  cancel(sessionId: string): void;
}
