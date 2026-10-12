-- Permanent map addresses. Deleting or unpublishing a project never reassigns its slot.
ALTER TABLE ecosystem_projects ADD COLUMN IF NOT EXISTS map_slot integer;
CREATE SEQUENCE IF NOT EXISTS ecosystem_project_map_slot_seq START WITH 14;
UPDATE ecosystem_projects SET map_slot = CASE slug
  WHEN 'kairo' THEN 0 WHEN 'arcid' THEN 1 WHEN 'arcflow' THEN 2 WHEN 'arclight' THEN 3
  WHEN 'argus' THEN 4 WHEN 'arcstocks' THEN 5 WHEN 'bagfi' THEN 6 WHEN 'foci' THEN 7
  WHEN 'faze' THEN 8 WHEN 'fuci' THEN 9 WHEN 'kata-finance' THEN 10 WHEN 'murmur' THEN 11
  WHEN 'tolly' THEN 12 WHEN 'vialiq' THEN 13 END
WHERE map_slot IS NULL AND slug IN ('kairo','arcid','arcflow','arclight','argus','arcstocks','bagfi','foci','faze','fuci','kata-finance','murmur','tolly','vialiq');
UPDATE ecosystem_projects SET map_slot = nextval('ecosystem_project_map_slot_seq') WHERE map_slot IS NULL;
ALTER TABLE ecosystem_projects ALTER COLUMN map_slot SET DEFAULT nextval('ecosystem_project_map_slot_seq');
ALTER TABLE ecosystem_projects ALTER COLUMN map_slot SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ecosystem_projects_map_slot_idx ON ecosystem_projects(map_slot);
