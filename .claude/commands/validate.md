# Validation Command

Validate implementation against specification and constitution.

## Instructions

1. Read the original specification
2. Run all tests
3. Check each acceptance criterion
4. Verify constitution alignment
5. Generate validation report

## Checklist

### Constitution Compliance

- [ ] **Article I - Spec-Driven**: Implementation matches specification
- [ ] **Article II - Test-First**: All features have tests that were written first
- [ ] **Article III - Simplicity**: No unnecessary complexity
- [ ] **Article IV - Library-First**: Components are standalone where possible
- [ ] **Article V - Integration Testing**: Real environment tests exist

### Acceptance Criteria

For each scenario in the spec:
- [ ] Scenario passes as defined
- [ ] Edge cases handled
- [ ] Error cases covered

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] ESLint passes with no errors
- [ ] Test coverage >= 80%
- [ ] No security vulnerabilities

### Documentation

- [ ] README updated if needed
- [ ] API documentation current
- [ ] Changelog entry added

## Template Report

```markdown
# Validation Report: {Feature Name}

**Date**: {Date}
**Spec**: docs/specs/{feature-name}.md
**Status**: Pass/Fail

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| Constitution | Pass/Fail | {Notes} |
| Acceptance Criteria | Pass/Fail | {Notes} |
| Code Quality | Pass/Fail | {Notes} |
| Documentation | Pass/Fail | {Notes} |

## Test Results

- Total Tests: {N}
- Passing: {N}
- Failing: {N}
- Coverage: {N}%

## Acceptance Criteria Status

| Scenario | Status | Notes |
|----------|--------|-------|
| {Scenario 1} | Pass/Fail | {Notes} |
| {Scenario 2} | Pass/Fail | {Notes} |

## Issues Found

1. {Issue description and location}
2. {Issue description and location}

## Recommendations

- {Recommendation 1}
- {Recommendation 2}

## Sign-off

- [ ] Ready for merge
- [ ] Needs additional work (see issues above)
```

$ARGUMENTS
