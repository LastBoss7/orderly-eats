-- Add is_approved column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Approve all existing active restaurants automatically
UPDATE restaurants SET is_approved = true WHERE is_active = true;