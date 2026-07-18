export interface IKnowledge {
  /** Retrieve knowledge for given queries */
  retrieve(query: string, options?: any): Promise<any[]>;
  /** Rank a set of evidences */
  rank(evidences: any[]): Promise<any[]>;
  /** Compress knowledge representation */
  compress(data: any): Promise<any>;
}
