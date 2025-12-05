# Implementation Command

Execute tasks from a task list systematically.

## Instructions

1. Read tasks from `docs/tasks/{feature-name}-tasks.md`
2. For each task:
   - Mark as in-progress `[~]`
   - Write tests first (Article II)
   - Implement the solution
   - Verify tests pass
   - Mark as completed `[x]`
3. Update task file after each completion
4. Report progress

## Workflow

```
For each task:
  1. Read task requirements
  2. Write failing test (TDD)
  3. Implement minimal solution
  4. Verify test passes
  5. Refactor if needed
  6. Update task status
  7. Commit changes
```

## Guidelines

### Test-First (Non-negotiable)
```typescript
// 1. Write the test FIRST
describe('featureName', () => {
  it('should do expected behavior', () => {
    // Arrange
    const input = {...};

    // Act
    const result = featureName(input);

    // Assert
    expect(result).toBe(expected);
  });
});

// 2. Run test - it should FAIL
// 3. Implement minimal code to pass
// 4. Refactor if needed
```

### Commit Pattern
```
feat(scope): implement {task description}

- Add {component/function}
- Add tests for {what was tested}
- Closes #{issue-number} (if applicable)
```

### Progress Reporting

After completing each task, report:
- Task ID and description
- Tests written
- Implementation summary
- Any blockers or notes

## Execution

$ARGUMENTS

---

Start by reading the task list and identifying the next incomplete task.
