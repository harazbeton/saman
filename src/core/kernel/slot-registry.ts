import React from 'react';
import { PluginSlotName, PluginSlotConfig } from './types';

export interface RegisteredSlotComponent {
  pluginId: string;
  slotConfig: PluginSlotConfig;
  component: React.ComponentType<any>;
}

export class SlotRegistry {
  private static instance: SlotRegistry;
  private slotsMap: Map<PluginSlotName, RegisteredSlotComponent[]> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): SlotRegistry {
    if (!SlotRegistry.instance) {
      SlotRegistry.instance = new SlotRegistry();
    }
    return SlotRegistry.instance;
  }

  public registerSlotComponent(
    pluginId: string,
    slotConfig: PluginSlotConfig,
    component: React.ComponentType<any>
  ) {
    const existing = this.slotsMap.get(slotConfig.target) || [];
    // Replace if already registered for same pluginId and componentId
    const filtered = existing.filter(
      (item) => !(item.pluginId === pluginId && item.slotConfig.componentId === slotConfig.componentId)
    );
    filtered.push({ pluginId, slotConfig, component });
    // Sort by priority descending
    filtered.sort((a, b) => b.slotConfig.priority - a.slotConfig.priority);

    this.slotsMap.set(slotConfig.target, filtered);
    this.notify();
  }

  public unregisterPluginSlots(pluginId: string) {
    for (const [target, components] of this.slotsMap.entries()) {
      const filtered = components.filter((item) => item.pluginId !== pluginId);
      this.slotsMap.set(target, filtered);
    }
    this.notify();
  }

  public getComponentsForSlot(target: PluginSlotName): RegisteredSlotComponent[] {
    return this.slotsMap.get(target) || [];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const globalSlotRegistry = SlotRegistry.getInstance();
