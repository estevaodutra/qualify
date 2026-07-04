-- =====================================================
-- Guarantee at most one Start/trigger node per group-campaign
-- sequence at the database level. Dispatch sequences have no
-- node table (their Start config lives on dispatch_sequences.
-- trigger_type/trigger_config and the node is reconstructed in
-- memory on load), so no equivalent constraint applies there --
-- uniqueness for dispatch is guaranteed by the existing
-- hydration logic in UnifiedSequenceBuilder, which only injects
-- a Start node when none is already present in the node array.
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_nodes_single_trigger
  ON public.sequence_nodes (sequence_id)
  WHERE node_type = 'trigger';
