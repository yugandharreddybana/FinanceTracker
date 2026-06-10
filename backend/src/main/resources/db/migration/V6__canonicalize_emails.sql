-- =============================================================================
-- Migration V6: Canonicalize Emails
-- Normalises all existing user emails and usernames to lowercase and trimmed format
-- to ensure consistent lookup and prevent case-sensitive lockout bypasses.
-- =============================================================================

-- Update physical user emails and usernames
UPDATE finance_app.app_users 
SET email = LOWER(TRIM(email)), 
    username = LOWER(TRIM(username));

-- Update user profile emails
UPDATE finance_app.user_profiles 
SET email = LOWER(TRIM(email));
