export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  entry: string;
}

export interface PluginPermissions {
  network?: string[];
  env?: string[];
  filesystem?: Array<"read" | "write">;
}

export type PluginAction = (params: any) => Promise<any> | any;
