export interface IWorkspace {
  /** Index a file or directory */
  indexPath(path: string): Promise<void>;
  /** Retrieve indexed metadata */
  query(query: any): Promise<any[]>;
  /** Create a workspace snapshot */
  snapshot(name: string): Promise<void>;
}
