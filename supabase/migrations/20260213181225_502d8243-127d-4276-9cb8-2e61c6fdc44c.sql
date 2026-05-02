ALTER TABLE dispatch_sequence_logs
  DROP CONSTRAINT dispatch_sequence_logs_step_id_fkey;

ALTER TABLE dispatch_sequence_logs
  ADD CONSTRAINT dispatch_sequence_logs_step_id_fkey
  FOREIGN KEY (step_id) REFERENCES dispatch_sequence_steps(id)
  ON DELETE SET NULL;