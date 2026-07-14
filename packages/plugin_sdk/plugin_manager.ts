import path from "node:path";
import fs from "fs-extra";
import { eventBus, RuntimeEvent } from "../core/index.js";
import { PluginLifecycleState, PluginManifest, AgathiSDK } from "./types.js";

export class plugin_manager {
  private plugins = new Map<string, {
    manifest: PluginManifest;
    actions: Record<string, any>;
    events?: Record<string, any>;
    permissions?: any;
    sdk: AgathiSDK;
  }>();

  private states = new Map<string, PluginLifecycleState>();
  private activeSubscriptions = new Map<string, Array<{ eventName: string; handler: any }>>();

  async loadPlugins(pluginsDir: string) {
    if (!await fs.pathExists(pluginsDir)) return;
    const dirs = await fs.readdir(pluginsDir);

    for (const dirName of dirs) {
      const pluginPath = path.join(pluginsDir, dirName);
      const stat = await fs.stat(pluginPath);
      if (!stat.isDirectory()) continue;

      let manifestPath = path.join(pluginPath, "manifest.json");
      if (!await fs.pathExists(manifestPath)) {
        const srcPath = pluginPath.replace("/dist/packages/", "/packages/");
        manifestPath = path.join(srcPath, "manifest.json");
      }
      if (!await fs.pathExists(manifestPath)) continue;

      const manifest: PluginManifest = await fs.readJson(manifestPath);
      const pluginId = manifest.id || dirName;

      this.states.set(pluginId, "installed");

      // Validate manifest
      if (!manifest.id || !manifest.version || !manifest.entry) {
        console.error(`Validation Failed: Plugin ${dirName} has invalid manifest.`);
        this.states.set(pluginId, "installed"); // Keep at installed
        continue;
      }
      this.states.set(pluginId, "validated");

      // Ensure isolation directories exist
      const dataDir = path.join(pluginPath, "data");
      const cacheDir = path.join(pluginPath, "cache");
      const logsDir = path.join(pluginPath, "logs");
      await fs.ensureDir(dataDir);
      await fs.ensureDir(cacheDir);
      await fs.ensureDir(logsDir);

      // Create stable versioned SDK instance for this plugin
      const sdk: AgathiSDK = {
        apiVersion: "1.0",
        events: {
          emit: (eventName, payload) => {
            eventBus.emitEvent(eventName as any, payload);
          },
          subscribe: (eventPattern, handler) => {
            const regex = new RegExp("^" + eventPattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
            const listener = async (event: RuntimeEvent) => {
              if (regex.test(event.type) && this.states.get(pluginId) === "running") {
                await handler(event);
              }
            };
            eventBus.on(eventPattern as any, listener);
            
            // Track subscription for disable/enable lifecycle
            if (!this.activeSubscriptions.has(pluginId)) {
              this.activeSubscriptions.set(pluginId, []);
            }
            this.activeSubscriptions.get(pluginId)!.push({ eventName: eventPattern, handler: listener });
          }
        },
        workspace: {
          getProjectPath: () => process.cwd(),
          getSnapshots: async () => {
            const snapDir = path.join(process.cwd(), "workspace", "snapshots");
            if (await fs.pathExists(snapDir)) {
              return fs.readdir(snapDir);
            }
            return [];
          }
        },
        logger: {
          info: (msg) => {
            const formatted = `[${new Date().toISOString()}] [INFO] [${pluginId}]: ${msg}\n`;
            fs.appendFileSync(path.join(logsDir, "plugin.log"), formatted);
            console.log(formatted.trim());
          },
          error: (msg, err) => {
            const formatted = `[${new Date().toISOString()}] [ERROR] [${pluginId}]: ${msg} ${err?.message || ""}\n`;
            fs.appendFileSync(path.join(logsDir, "plugin.log"), formatted);
            console.error(formatted.trim());
          }
        },
        storage: {
          dataDir,
          cacheDir,
          logsDir
        }
      };

      try {
        const entryModulePath = path.join(pluginPath, manifest.entry);
        const entryModule = await import(`file://${entryModulePath}`);

        this.plugins.set(pluginId, {
          manifest,
          actions: entryModule.actions || {},
          events: entryModule.events || {},
          permissions: manifest.permissions || {},
          sdk
        });

        this.states.set(pluginId, "loaded");

        // Subscribe to manifest-declared events
        if (entryModule.events) {
          for (const [eventName, handler] of Object.entries(entryModule.events)) {
            // Apply event filtering based on manifest specifications
            if (manifest.events && !manifest.events.includes(eventName)) {
              console.warn(`Event ${eventName} ignored: Not declared in manifest of plugin ${pluginId}.`);
              continue;
            }
            sdk.events.subscribe(eventName, handler as any);
          }
        }

        this.states.set(pluginId, "running");

      } catch (e: any) {
        console.error(`Failed to load entrypoint for plugin ${pluginId}:`, e.message);
        this.states.set(pluginId, "disabled");
      }
    }
  }

  async executePlugin(pluginId: string, actionName: string, params: any): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const currentState = this.states.get(pluginId);
    if (currentState !== "running") {
      throw new Error(`Cannot execute: Plugin ${pluginId} is in state ${currentState}`);
    }

    // Verify Action declaration in Manifest
    if (!plugin.manifest.actions.includes(actionName)) {
      throw new Error(`Security Violation: Action ${actionName} is not declared in manifest for plugin ${pluginId}`);
    }

    const action = plugin.actions[actionName];
    if (!action) {
      throw new Error(`Action ${actionName} not implemented on plugin ${pluginId}`);
    }

    // Validate env permissions
    if (plugin.permissions?.env) {
      for (const envVar of plugin.permissions.env) {
        if (!process.env[envVar]) {
          throw new Error(`Security Violation: Plugin ${pluginId} requires environment variable ${envVar} to be set.`);
        }
      }
    }

    eventBus.emitEvent("PLUGIN_TRIGGERED" as any, { plugin: pluginId, action: actionName, params });
    return action(params, plugin.sdk);
  }

  disablePlugin(pluginId: string) {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    this.states.set(pluginId, "disabled");
  }

  enablePlugin(pluginId: string) {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    this.states.set(pluginId, "running");
  }

  getPluginState(pluginId: string): PluginLifecycleState | undefined {
    return this.states.get(pluginId);
  }

  listLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginPermissions(pluginId: string) {
    return this.plugins.get(pluginId)?.permissions;
  }
}

export const pluginManager = new plugin_manager();
