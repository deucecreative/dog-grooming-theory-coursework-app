# Archived Migration Files

These migration files were consolidated into `001_consolidated_schema.sql` on 2025-08-19 for Phase 3 implementation.

## Files Archived:

### `001_initial_schema.sql`
- Original database schema with tables, RLS policies, and basic auth trigger
- **Issue**: Auth trigger had bugs, RLS policies caused infinite recursion

### `002_auth_triggers.sql` 
- First attempt to fix auth trigger function
- **Issue**: Still had problems with profile creation during signup

### `003_fix_rls_policies.sql`
- Fixed RLS policies to use `auth.jwt()` instead of recursive profile table queries
- **Success**: Resolved infinite recursion issues in RLS policies

### `004_fix_auth_trigger.sql`
- Improved auth trigger with better error handling
- **Partial Success**: Better error handling but still missing RLS permissions

### `005_debug_trigger.sql`
- Debug version with extensive logging to troubleshoot trigger issues
- **Debug Only**: Not for production use

### `006_fix_trigger_rls.sql`
- **Final working version**: Fixed RLS policies to allow profile creation during signup
- Added proper INSERT policies for the auth trigger
- **Success**: All authentication flows working correctly

## Consolidation Results:

The consolidated migration includes:
- ✅ Complete database schema (tables, indexes, triggers)
- ✅ Working RLS policies using `auth.jwt()` (from 003)
- ✅ Functional auth trigger with proper error handling (from 006)
- ✅ Proper INSERT policies for profile creation (from 006)
- ✅ All permissions and grants needed for authentication

## New Installation:
New projects should use only `001_consolidated_schema.sql` - it contains all the working fixes in a single, clean migration file.

## Phase 2 Testing:
All authentication flows were tested and verified working with the consolidated schema:
- User registration ✅
- User login ✅  
- Profile creation ✅
- Role-based access ✅
- RLS policy enforcement ✅