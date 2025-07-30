-- Migration 6: add nullable username column to users table

-- Add the column with no default so it will be NULL for existing rows
ALTER TABLE users ADD COLUMN username TEXT;

-- Existing records will automatically have NULL in the new column.

