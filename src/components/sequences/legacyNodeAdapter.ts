import type { LocalNode } from "./shared-types";
import { isActionSubType, isContentSubType } from "./nodeDefinitions";

// Translates between the legacy, literal node_type strings persisted to
// sequence_nodes (message/image/.../tag_add/tag_remove/deal_move/channel_select)
// and the grouped "content"/"action" node types the canvas/config-panel now
// operate on. This is a pure, frontend-only boundary: the DB and the
// execute-message executor keep storing/interpreting the exact same literal
// node_type strings as before — nothing about persistence or execution
// changes, only what the in-memory LocalNode looks like while it's on screen.
//
// Every other node type (delay/condition/randomizer/trigger/field_op/api_call/
// ai_agent/group management types) passes through unchanged in both
// directions.

export function liftLegacyNode(node: LocalNode): LocalNode {
  if (isContentSubType(node.nodeType)) {
    return { ...node, nodeType: "content", config: { ...node.config, contentType: node.nodeType } };
  }
  if (isActionSubType(node.nodeType)) {
    return { ...node, nodeType: "action", config: { ...node.config, actionType: node.nodeType } };
  }
  return node;
}

export function lowerToLegacyNode(node: LocalNode): LocalNode {
  if (node.nodeType === "content") {
    const { contentType, ...rest } = node.config;
    return { ...node, nodeType: (contentType as string) || "message", config: rest };
  }
  if (node.nodeType === "action") {
    const { actionType, ...rest } = node.config;
    return { ...node, nodeType: (actionType as string) || "tag_add", config: rest };
  }
  return node;
}
