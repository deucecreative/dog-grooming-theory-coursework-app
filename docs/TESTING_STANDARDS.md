# Testing Standards & Guidelines

This document establishes comprehensive testing standards for the dog grooming theory coursework application.

## 🎯 **Test Categories**

### **Unit Tests**
- **Purpose**: Test individual functions/components in isolation
- **Location**: `src/**/*.test.{ts,tsx}`
- **Execution**: `npm run test:unit`
- **Speed**: Fast (< 100ms per test)

### **Integration Tests**
- **Purpose**: Test interactions between components/services
- **Location**: `src/**/__tests__/integration/`
- **Execution**: `npm run test:integration`
- **Speed**: Medium (< 1s per test)

### **E2E Tests**
- **Purpose**: Test full user workflows
- **Location**: `src/**/__tests__/e2e/`
- **Execution**: `RUN_E2E_TESTS=true npm run test:e2e`
- **Speed**: Slow (< 45s per test)
- **Status**: ⚠️ **REQUIRES SETUP** - Currently non-functional
- **Requirements**: 
  - Running Next.js server at localhost:3000
  - Test database configuration
  - Proper API authentication setup

## 📝 **Naming Conventions**

### **Test Descriptions**
Follow the pattern: `should [expected behavior] when [condition]`

**✅ Good Examples:**
```typescript
it('should return user data when valid ID provided', async () => {})
it('should throw error when user not found', async () => {})
it('should validate email format when creating invitation', async () => {})
```

**❌ Bad Examples:**
```typescript
it('CRITICAL: Should test permissions', async () => {}) // Too vague
it('gets user data', async () => {}) // Missing "should"
it('user validation', async () => {}) // Not descriptive
```

### **Special Cases**
- **Critical tests**: Use `CRITICAL:` prefix for high-priority integration tests
- **Security tests**: Use `SECURITY:` prefix for security validation
- **Performance tests**: Use `PERF:` prefix for performance validation

## 🔧 **Code Standards**

### **Test Structure (AAA Pattern)**
```typescript
it('should return success when valid data provided', async () => {
  // Arrange
  const validUser = { email: 'test@example.com', role: 'student' }
  const mockResponse = { success: true, id: '123' }
  
  // Act
  const result = await createUser(validUser)
  
  // Assert
  expect(result).toEqual(mockResponse)
  expect(result.success).toBe(true)
})
```

### **Assertions**
- **Use proper expectations**: Always use `expect()` statements
- **Be specific**: Use precise matchers (`toBe`, `toEqual`, `toContain`)
- **No console.log**: Never use console.log as assertions
- **Error testing**: Use `expect.fail()` for intentional failures

### **Lifecycle Hooks**
```typescript
describe('Component Tests', () => {
  beforeEach(() => {
    // Setup before each test
  })
  
  afterEach(async () => {
    // Cleanup after each test
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })
})
```

## 🛡️ **Security Testing**

### **Authentication Tests**
- Test unauthenticated access is blocked
- Verify proper role-based access control
- Test session management and cleanup

### **Data Validation**
- Test input sanitization
- Verify SQL injection protection
- Test XSS protection

## 🚀 **Performance Standards**

### **Test Execution Timeouts**
- **Unit tests**: 5 seconds (default)
- **Integration tests**: 10 seconds
- **E2E tests**: 30 seconds

### **Coverage Requirements**
- **Branches**: 70% minimum
- **Functions**: 70% minimum  
- **Lines**: 70% minimum
- **Statements**: 70% minimum

## 🔄 **Best Practices**

### **Test Independence**
- Tests must not depend on each other
- Use proper setup/teardown for isolation
- Clean up resources (database, auth sessions)

### **Mocking Strategy**
- Mock external dependencies
- Use consistent mock patterns
- Prefer dependency injection for testability

### **Error Handling**
- Test both success and failure scenarios
- Verify proper error messages
- Test edge cases and boundary conditions

### **Documentation**
- Comment complex test scenarios
- Explain mock setups when non-obvious
- Document test data requirements

## 🔧 **Tools & Configuration**

### **Testing Framework**
- **Vitest**: Primary test runner
- **React Testing Library**: Component testing
- **Supabase Test Client**: Database testing

### **Configuration Files**
- `vitest.config.ts`: Main configuration
- `vitest.unit.config.ts`: Unit test configuration
- `vitest.integration.config.ts`: Integration configuration

### **Quality Gates**
- All tests must pass before merge
- Coverage thresholds must be met
- No .only or focused tests in commits
- Proper cleanup verified

## 📊 **Monitoring & Reporting**

### **Test Health Metrics**
- Pass/fail rates by category
- Test execution times
- Coverage trends
- Flaky test identification

### **Quality Metrics**
- Assertion quality (no console.log)
- Setup/teardown consistency
- Naming convention compliance
- Test independence verification

---

**Last Updated**: 2025-01-22  
**Version**: 1.0.0  
**Maintained by**: Development Team