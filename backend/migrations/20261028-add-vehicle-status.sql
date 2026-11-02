-- Vehicle operational status. Existing rows receive the default.
-- Skip this statement if `vehicles.status` is already present.
ALTER TABLE vehicles
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'available';

-- Covers a column that was added without a default, and blank values.
UPDATE vehicles
SET status = 'available'
WHERE status IS NULL OR status = '';
