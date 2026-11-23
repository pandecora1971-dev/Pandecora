-- Apply once to an existing deployment before using the new SUPERADMIN role.
-- This preserves existing accounts, passwords, and role assignments.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
