ALTER TABLE queue_execution_state
ADD COLUMN current_operator_index integer NOT NULL DEFAULT 0;