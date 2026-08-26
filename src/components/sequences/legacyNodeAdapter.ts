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

import { normalizePollOptions } from "./shared-types";

export function liftLegacyNode(node: LocalNode): LocalNode {
  let processed = { ...node };

  if (processed.nodeType === "content") {
    // Already migrated to container, ensure messages array exists
    if (!processed.config.messages) {
      processed = { ...processed, config: { ...processed.config, messages: [] } };
    }
  } else if (processed.nodeType === "action") {
    const actionType = (processed.config.actionType as string) || "create_lead";
    processed = { ...processed, config: { ...processed.config, actionType } };
  } else if (isContentSubType(processed.nodeType)) {
    // Lift legacy literal node to a container node with 1 message
    const messageId = Math.random().toString(36).substring(2, 9);
    processed = { 
      ...processed, 
      nodeType: "content", 
      config: { 
        messages: [{
          id: messageId,
          type: processed.nodeType,
          ...processed.config
        }]
      } 
    };
  } else if (
    isActionSubType(processed.nodeType) ||
    processed.nodeType === "create_lead" ||
    processed.nodeType === "lead_create" ||
    processed.nodeType === "delete_lead" ||
    processed.nodeType === "create_deal" ||
    processed.nodeType === "deal_create" ||
    processed.nodeType === "move_deal_stage" ||
    processed.nodeType === "move_deal" ||
    processed.nodeType === "deal_move" ||
    processed.config?.category === "lead" ||
    processed.config?.category === "deal"
  ) {
    const actionType = (processed.config.actionType as string) || processed.nodeType;
    processed = { ...processed, nodeType: "action", config: { ...processed.config, actionType } };
  }

  // Normalize poll options if present
  if (processed.config.options) {
    processed = {
      ...processed,
      config: {
        ...processed.config,
        options: normalizePollOptions(processed.config.options as unknown[]),
      },
    };
  }

  if (Array.isArray(processed.config.messages)) {
    const updatedMessages = (processed.config.messages as any[]).map((msg) => {
      if (msg.type === "poll" && msg.options) {
        return {
          ...msg,
          options: normalizePollOptions(msg.options),
        };
      }
      return msg;
    });
    processed = {
      ...processed,
      config: {
        ...processed.config,
        messages: updatedMessages,
      },
    };
  }

  return processed;
}

export function lowerToLegacyNode(node: LocalNode): LocalNode {
  if (node.nodeType === "content") {
    // Save as "content" node, backend will process config.messages
    return node;
  }
  if (node.nodeType === "action") {
    const { actionType, ...rest } = node.config;
    const legacyType = (actionType as string) || "create_lead";
    return { ...node, nodeType: legacyType, config: { ...rest, actionType: legacyType } };
  }
  return node;
}
