-- Migration 9: Remove obsolete email_verification_tokens table

DROP TABLE IF EXISTS email_verification_tokens;

-- The email_verified column on users table is kept so we can still track
-- whether a user has opened at least one e-mail sent by the service.

