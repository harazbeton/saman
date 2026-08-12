import { PluginManifest, UserContext } from './types';
import { globalSlotRegistry } from './slot-registry';

export interface PluginModule {
  manifest: PluginManifest;
  registerComponents?: () => void;
  onEnable?: (context: PluginContext) => void;
  onDisable?: () => void;
}

export interface PluginContext {
  pluginId: string;
  user: UserContext;
  services: any;
  events: {
    publish: (type: string, payload: any) => Promise<void>;
    subscribe: (type: string, handler: (event: any) => void) => () => void;
  };
  ui: {
    showNotification: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, PluginModule> = new Map();
  private activeUser: UserContext | null = null;

  private constructor() {}

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  public setUserContext(user: UserContext) {
    this.activeUser = user;
  }

  public getUserContext(): UserContext | null {
    return this.activeUser;
  }

  public registerPlugin(plugin: PluginModule) {
    const { manifest } = plugin;
    this.plugins.set(manifest.id, plugin);

    if (manifest.enabled) {
      this.enablePlugin(manifest.id);
    }
  }

  public enablePlugin(pluginId: string) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.manifest.enabled = true;
    if (plugin.registerComponents) {
      plugin.registerComponents();
    }
  }

  public disablePlugin(pluginId: string) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.manifest.enabled = false;
    globalSlotRegistry.unregisterPluginSlots(pluginId);
    if (plugin.onDisable) {
      plugin.onDisable();
    }
  }

  public togglePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    if (plugin.manifest.enabled) {
      this.disablePlugin(pluginId);
      return false;
    } else {
      this.enablePlugin(pluginId);
      return true;
    }
  }

  public getAllManifests(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  public getPlugin(pluginId: string): PluginModule | undefined {
    return this.plugins.get(pluginId);
  }
}

export const globalPluginRegistry = PluginRegistry.getInstance();
