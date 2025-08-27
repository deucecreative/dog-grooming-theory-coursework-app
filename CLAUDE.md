# Non-negotiables
- Always follow DRY principles and TDD.
- ALWAYS run the full test suite (`npm test -- --run`) after any file modification, on task completion, and certainly before any Git commit. This includes E2E/Integration tests, even if it means starting dev servers.
- Git commits, or any further development, should NEVER be made when there are failing tests, or linter/TypeScript errors or warnings.
- PROJECT.md must be updated BEFORE starting any new task and IMMEDIATELY after completing any milestone, so that another dev can confidently take over at short notice.