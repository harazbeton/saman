import React, { useState, useEffect } from 'react';
import { PluginSlotName } from '../core/kernel/types';
import { globalSlotRegistry, RegisteredSlotComponent } from '../core/kernel/slot-registry';

interface PluginSlotRendererProps {
  name: PluginSlotName;
  fallback?: React.ReactNode;
}

export const PluginSlotRenderer: React.FC<PluginSlotRendererProps> = ({ name, fallback }) => {
  const [components, setComponents] = useState<RegisteredSlotComponent[]>([]);

  useEffect(() => {
    const update = () => {
      setComponents(globalSlotRegistry.getComponentsForSlot(name));
    };

    update();
    const unsub = globalSlotRegistry.subscribe(update);
    return () => unsub();
  }, [name]);

  if (components.length === 0) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div className="space-y-4">
      {components.map((item) => {
        const Comp = item.component;
        return <Comp key={`${item.pluginId}-${item.slotConfig.componentId}`} />;
      })}
    </div>
  );
};
