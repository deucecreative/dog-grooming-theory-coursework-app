# Non-negotiables
– Always follow DRY principles and TDD.
- ALWAYS run the full test suite after any significant code changes, on task completion, and certainly before any Git commit. This should include E2E/Integration tests, even if it means starting dev servers to complete.
- Git commits should NEVER be made when there are failing tests, or linter/TypeScript errors or warnings.