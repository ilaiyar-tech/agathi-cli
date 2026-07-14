export interface CapabilityManifest {
  name: string;
  category: "vcs" | "cloud" | "container" | "db" | "collaboration" | "custom";
  version: string;
  securityLevel: "safe" | "restricted" | "privileged";
  permissions: string[];
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  cost: number;
  timeout: number;
  concurrencyLimit: number;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  dependencies: string[];
  provider: string;
  available: boolean;
  estimatedResources?: {
    cpu?: number;
    memoryMb?: number;
    network?: boolean;
  };
  supportsRollback: boolean;
}

export class CapabilityRegistry {
  private registry = new Map<string, CapabilityManifest>();

  registerCapability(manifest: CapabilityManifest): void {
    if (this.registry.has(manifest.name)) {
      throw new Error(`CapabilityRegistry: Capability '${manifest.name}' is already registered`);
    }
    this.registry.set(manifest.name, manifest);
  }

  getCapability(name: string): CapabilityManifest | undefined {
    return this.registry.get(name);
  }

  listCapabilities(): CapabilityManifest[] {
    return Array.from(this.registry.values());
  }

  searchCapabilities(query: string): CapabilityManifest[] {
    const lower = query.toLowerCase();
    return this.listCapabilities().filter(
      c => c.name.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower)
    );
  }

  checkHealth(name: string): "healthy" | "unhealthy" | "unknown" {
    const cap = this.getCapability(name);
    return cap ? cap.healthStatus : "unknown";
  }

  updateHealth(name: string, status: "healthy" | "unhealthy"): void {
    const cap = this.getCapability(name);
    if (cap) {
      cap.healthStatus = status;
    }
  }

  clear(): void {
    this.registry.clear();
  }
}

export const capabilityRegistry = new CapabilityRegistry();
