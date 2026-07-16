import { LucideIcon } from "lucide-react";

export interface LocalNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
  positionX?: number;
  positionY?: number;
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
  /** "coming_soon" renders the tile disabled with an "Em breve" badge in the
   * palette (e.g. API / AI Assistant, which have no executor support yet). */
  status?: "available" | "coming_soon";
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

export interface TriggerItem {
  id: string;
  type: string;
  dataSource: string;
  config?: Record<string, unknown>;
}

export interface UnifiedSequenceItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  isActive: boolean;
}

export interface RandomizerBranch {
  id: string;
  label: string;
  weight: number;
  position: number;
}

export interface RandomizerConfig {
  mode: "weighted_random" | "round_robin";
  branches: RandomizerBranch[];
}

export interface MessageAction {
  id: string;
  type: string;
  [key: string]: any;
}
