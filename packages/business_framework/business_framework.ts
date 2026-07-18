import { memory } from "../memory/memory_engine.js";
import { SecuritySystem } from "../core/index.js";

export interface BusinessModuleManifest {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  permissions: string[];
}

export interface BusinessModule {
  manifest: BusinessModuleManifest;
  initialize(): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

export class BusinessModuleManager {
  private modules = new Map<string, BusinessModule>();
  private activeModules = new Set<string>();

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      memory.database.exec(`
        CREATE TABLE IF NOT EXISTS business_modules (
          name TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL,
          installed_at INTEGER NOT NULL
        );
      `);
    } catch (e) {
      console.error("Failed to initialize business_modules table:", e);
    }
  }

  async install(module: BusinessModule): Promise<void> {
    const { name, version, description } = module.manifest;
    memory.database.prepare(`
      INSERT OR REPLACE INTO business_modules (name, version, description, status, installed_at)
      VALUES (?, ?, ?, 'installed', ?)
    `).run(name, version, description, Date.now());
    this.modules.set(name, module);
  }

  async initialize(name: string): Promise<void> {
    const mod = this.modules.get(name);
    if (!mod) throw new Error(`module_not_found: ${name}`);
    await mod.initialize();
  }

  async activate(name: string): Promise<void> {
    const mod = this.modules.get(name);
    if (!mod) throw new Error(`module_not_found: ${name}`);
    await mod.activate();
    this.activeModules.add(name);
    memory.database.prepare("UPDATE business_modules SET status = 'active' WHERE name = ?").run(name);
  }

  async deactivate(name: string): Promise<void> {
    const mod = this.modules.get(name);
    if (!mod) throw new Error(`module_not_found: ${name}`);
    await mod.deactivate();
    this.activeModules.delete(name);
    memory.database.prepare("UPDATE business_modules SET status = 'inactive' WHERE name = ?").run(name);
  }

  listModules(): any[] {
    return memory.database.prepare("SELECT * FROM business_modules").all();
  }

  isActive(name: string): boolean {
    return this.activeModules.has(name);
  }
}

export class BusinessAuthSystem {
  static authenticate(user: string, pass: string): boolean {
    return SecuritySystem.authenticate(user, pass);
  }
}

export class BusinessCLIRegistry {
  private static commands = new Map<string, (args: any) => Promise<void>>();

  static registerCommand(name: string, handler: (args: any) => Promise<void>) {
    this.commands.set(name, handler);
  }

  static async executeCommand(name: string, args: any): Promise<void> {
    const handler = this.commands.get(name);
    if (!handler) throw new Error(`command_not_found: ${name}`);
    await handler(args);
  }

  static getCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}

export class BusinessUIRegistry {
  private static widgets = new Map<string, any>();

  static registerWidget(id: string, config: any) {
    this.widgets.set(id, config);
  }

  static getWidgets(): any[] {
    return Array.from(this.widgets.values());
  }
}
