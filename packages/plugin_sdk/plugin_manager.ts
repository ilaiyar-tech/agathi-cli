import path from "node:path";
import fs from "fs-extra";
import { eventBus, RuntimeEvent } from "../core/index.js";

export class plugin_manager {
  private plugins = new Map<string, {
    manifest: any;
    actions: Record<string, any>;
    events?: Record<string, any>;
    permissions?: any;
  }>();

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

      const manifest = await fs.readJson(manifestPath);
      
      const entryModulePath = path.join(pluginPath, manifest.entry);
      const entryModule = await import(`file://${entryModulePath}`);

      this.plugins.set(manifest.name, {
        manifest,
        actions: entryModule.actions || {},
        events: entryModule.events || {},
        permissions: entryModule.permissions || {}
      });

      // Register event listeners
      if (entryModule.events) {
        for (const [eventName, handler] of Object.entries(entryModule.events)) {
          eventBus.on(eventName as any, async (event: RuntimeEvent) => {
            try {
              await (handler as any)(event);
            } catch (e: any) {
              console.error(`Plugin ${manifest.name} event handler failed for ${eventName}:`, e.message);
            }
          });
        }
      }
    }
  }

  async executePlugin(pluginName: string, actionName: string, params: any): Promise<any> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    const action = plugin.actions[actionName];
    if (!action) {
      throw new Error(`Action ${actionName} not found on plugin ${pluginName}`);
    }

    // Validate Permissions
    if (plugin.permissions?.env) {
      for (const envVar of plugin.permissions.env) {
        if (!process.env[envVar]) {
          throw new Error(`Security Violation: Plugin ${pluginName} requires Env Var ${envVar} to be set.`);
        }
      }
    }

    eventBus.emitEvent("PLUGIN_TRIGGERED" as any, { plugin: pluginName, action: actionName, params });
    return action(params);
  }

  listLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginPermissions(pluginName: string) {
    return this.plugins.get(pluginName)?.permissions;
  }
}

export const pluginManager = new plugin_manager();
