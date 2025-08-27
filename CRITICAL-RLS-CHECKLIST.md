# 🚨 CRITICAL: RLS & CRUD VERIFICATION CHECKLIST

## ⚠️ MANDATORY FOR ALL FUTURE AGENTS - READ THIS FIRST

**This checklist prevents the "Silent Deletion Failure" catastrophic bug that occurred on 2025-08-20.**

---

## 🛡️ PRE-DEVELOPMENT REQUIREMENTS

### Before touching ANY database table with RLS enabled:

- [ ] **Read the complete failure analysis in PROJECT.md** (Silent Deletion Failure section)
- [ ] **Run schema validation**: `npm run validate-schema`
- [ ] **Verify all RLS policies exist**: `npm run verify-rls`
- [ ] **Test CRUD operations**: `npm run verify-crud`

### If ANY of these scripts fail: STOP. Fix the issues before proceeding.

---

## 🔒 RLS POLICY REQUIREMENTS

### Every table with RLS MUST have policies for:

- [ ] **SELECT** - Read access
- [ ] **INSERT** - Create access  
- [ ] **UPDATE** - Modify access
- [ ] **DELETE** - Remove access ⚠️ **MOST COMMONLY MISSING**

### Check policies exist:
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'your_table_name'
ORDER BY cmd;
```

### Expected output for complete coverage:
```
DELETE | "Policy name for delete"
INSERT | "Policy name for insert"  
SELECT | "Policy name for select"
UPDATE | "Policy name for update"
```

---

## 🧪 API IMPLEMENTATION STANDARDS

### ❌ WRONG - Silent failures slip through:
```javascript
const { error } = await supabase.from('table').delete().eq('id', id)
if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })
return NextResponse.json({ message: 'Success' }) // ← LIES when RLS blocks operation
```

### ✅ CORRECT - Verifies actual operation success:
```javascript
const { data: deletedRows, error } = await supabase
  .from('table')
  .delete()
  .eq('id', id)
  .select() // ← CRITICAL: Returns deleted rows

if (error) {
  return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
}

// CRITICAL: Check if any rows were actually affected
if (!deletedRows || deletedRows.length === 0) {
  console.error('Silent deletion failure - check RLS policies')
  return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 })
}

return NextResponse.json({ message: 'Successfully deleted' })
```

### Apply the same pattern to UPDATE operations:
```javascript
const { data: updatedRows, error } = await supabase
  .from('table')
  .update({ field: 'value' })
  .eq('id', id)
  .select() // ← CRITICAL: Returns updated rows

if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

if (!updatedRows || updatedRows.length === 0) {
  return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 })
}

return NextResponse.json({ data: updatedRows[0] })
```

---

## 🧪 INTEGRATION TESTING REQUIREMENTS

### ❌ WRONG - Tests nothing useful:
```javascript
const response = await fetch('/api/delete/123', { method: 'DELETE' })
expect(response.ok).toBe(true) // ← Meaningless with RLS
```

### ✅ CORRECT - Verifies actual database changes:
```javascript
it('should actually delete record from database', async () => {
  // 1. Create test record
  const { data: record } = await supabase.from('table').insert({...}).select().single()
  
  // 2. Delete via API  
  const response = await fetch(`/api/delete/${record.id}`, { method: 'DELETE' })
  expect(response.ok).toBe(true)
  
  // 3. VERIFY ACTUAL DELETION FROM DATABASE
  const { data: shouldBeNull } = await supabase
    .from('table')
    .select()
    .eq('id', record.id)
    .maybeSingle()
  
  expect(shouldBeNull).toBeNull() // ← Would have caught the failure
})
```

---

## 🚨 WARNING SIGNS OF RLS PROBLEMS

### These symptoms indicate missing or broken RLS policies:

- ✅ **API returns 200 but records still visible in UI**
- ✅ **No server errors but database records persist after "deletion"**
- ✅ **Operations work in tests but fail in production**
- ✅ **Supabase returns `{ error: null, data: [] }` for operations**

### If you see these signs: IMMEDIATELY run the verification scripts.

---

## 📋 DEVELOPMENT WORKFLOW

### 1. Before starting any CRUD API:
```bash
npm run validate-schema  # Check enum compatibility
npm run verify-rls       # Check all policies exist  
npm run verify-crud      # Test operations work
```

### 2. While developing:
- Write integration tests that verify actual database changes
- Use `.select()` on all DELETE/UPDATE operations
- Never assume "no error = success" with RLS

### 3. Before declaring API "complete":
```bash
npm run verify-crud      # Must pass
npm test integration     # Must pass  
# Manual testing of actual UI functionality
```

---

## 🛠️ FIXING RLS POLICY ISSUES

### Common missing DELETE policy template:
```sql
CREATE POLICY "policy_name" ON table_name
  FOR DELETE USING (
    -- Admin can delete anything
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Users can delete their own records
    user_id = auth.uid()
    OR
    -- Other business logic conditions
    created_by = auth.uid()
  );
```

### Test the policy:
```sql
-- Test as different user roles
SELECT * FROM table_name; -- Should respect SELECT policies
DELETE FROM table_name WHERE id = 'test-id'; -- Should respect DELETE policies
```

---

## 🎯 SUCCESS CRITERIA

### API is only "complete" when:

- [ ] All verification scripts pass (`npm run verify-*`)
- [ ] Integration tests verify actual database changes
- [ ] Manual testing shows expected behavior
- [ ] All CRUD operations return accurate success/failure status
- [ ] No "silent failures" where API claims success but data doesn't change

---

## 📖 REFERENCE DOCUMENTATION

- **Full failure analysis**: See PROJECT.md "Silent Deletion Failure" section
- **Supabase RLS docs**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL policies**: https://www.postgresql.org/docs/current/sql-createpolicy.html

---

## 💥 ZERO TOLERANCE POLICY

**There is zero tolerance for APIs that lie about their success.**

If an API returns HTTP 200 "success" but doesn't actually perform the requested operation, this is a **catastrophic failure** that must be fixed immediately.

The combination of missing RLS policies + inadequate verification = broken user-facing features.

**Every future agent must follow this checklist to prevent repeating this mistake.**