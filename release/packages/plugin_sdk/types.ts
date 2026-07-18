export type PluginLifecycleState =
  | "installed"
  | "validated"
  | "loaded"
  | "enabled"
  | "running"
  | "disabled"
  | "unloaded"
  | "removed";

export interface PluginPermissions {
  filesystem?: Array<"read" | "write">;
  terminal?: Array<"execute">;
  network?: string[];
  git?: Array<"commit" | "push">;
  workspace?: Array<"modify">;
  env?: string[];
}

export interface PluginManifest {
  id: string;
  version: string;
  runtime: string;
  description: string;
  permissions: PluginPermissions;
  events: string[];
  actions: string[];
  dependencies?: string[];
  entry: string;
}

export type PluginAction = (params: any, sdk: AgathiSDK) => Promise<any> | any;

export interface AgathiSDK {
  apiVersion: string;
  events: {
    emit: (event: string, payload: any) => void;
    subscribe: (eventPattern: string, handler: (event: any) => Promise<void> | void) => void;
  };
  workspace: {
    getProjectPath: () => string;
    getSnapshots: () => Promise<string[]>;
  };
  logger: {
    info: (msg: string) => void;
    error: (msg: string, err?: any) => void;
  };
  storage: {
    dataDir: string;
    cacheDir: string;
    logsDir: string;
  };
}
