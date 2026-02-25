
-- Clean up orphaned auth users from failed migrations
DELETE FROM auth.users WHERE id::text LIKE 'd0000001-0000-0000-0000-%';
-- Clean up any orphaned profiles
DELETE FROM profiles WHERE id::text LIKE 'd0000001-0000-0000-0000-%';
-- Clean up orphaned user_balances  
DELETE FROM user_balances WHERE user_id::text LIKE 'd0000001-0000-0000-0000-%';
DELETE FROM user_scores WHERE user_id::text LIKE 'd0000001-0000-0000-0000-%';
