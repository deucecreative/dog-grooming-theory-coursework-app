# Non-negotiables
- Always follow DRY principles and TDD.
- ALWAYS run the full test suite (`RUN_E2E_TESTS=true npm run test:full`) before starting a task (if any fail, fix), on task completion, and certainly before any Git commit. This includes E2E/Integration tests, even if it means starting dev servers.
- **CRITICAL: NO TASK IS COMPLETE UNTIL ALL TESTS PASS.** If even 1 test fails, the task is NOT complete regardless of functionality. Fix all failing tests before claiming completion.
- Git commits, or any further development, should NEVER be made when there are failing tests, or linter/TypeScript errors or warnings.
- PROJECT.md must be updated BEFORE starting any new task and IMMEDIATELY after completing any milestone, so that another dev can confidently take over at short notice. It should not contain any information that could be misleading, such as past test results.

# Task Completion Definition
**A task is ONLY complete when:**
1. ✅ All functionality works as intended
2. ✅ **ALL tests pass** (0 failing tests)
3. ✅ No TypeScript errors or warnings
4. ✅ No linter errors or warnings
5. ✅ PROJECT.md is updated

**If ANY test fails, the task is NOT complete.** Never claim completion with failing tests.