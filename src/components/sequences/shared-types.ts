import { LucideIcon } from "lucide-react";

export interface LocalNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
}

export interface LocalConnection {
  sourceNodeId: string;
  targetNodeId: string;
  conditionPath?: string;
}

export interface NodeTypeInfo {
  type: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface NodeCategory {
  id: string;
  label: string;
  nodes: NodeTypeInfo[];
}

export interface TriggerTypeInfo {
  value: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  color?: string;
}

export interface UnifiedSequenceItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  isActive: boolean;
}
