ALTER TABLE dispatch_campaigns DROP CONSTRAINT dispatch_campaigns_instance_id_fkey;
ALTER TABLE dispatch_campaigns ADD CONSTRAINT dispatch_campaigns_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL;

ALTER TABLE pirate_campaigns DROP CONSTRAINT pirate_campaigns_instance_id_fkey;
ALTER TABLE pirate_campaigns ADD CONSTRAINT pirate_campaigns_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL;