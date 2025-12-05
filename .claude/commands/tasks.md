# Task Generation Command

Generate actionable tasks from an implementation plan.

## Instructions

1. Read the implementation plan from `docs/plans/{feature-name}-plan.md`
2. Break down into discrete, actionable tasks
3. Identify parallelizable work (mark with `[P]`)
4. Estimate complexity (S/M/L)
5. Save to `docs/tasks/{feature-name}-tasks.md`

## Template

```markdown
# Tasks: {Feature Name}

**Plan**: docs/plans/{feature-name}-plan.md
**Created**: {Date}
**Total Tasks**: {Count}

## Legend

- `[P]` = Can be parallelized
- `S/M/L` = Complexity (Small/Medium/Large)
- `[ ]` = Not started
- `[~]` = In progress
- `[x]` = Completed

---

## Phase 1: Foundation

### 1.1 Setup
- [ ] `[S]` Create project structure
- [ ] `[S]` Configure TypeScript
- [ ] `[S]` Setup testing framework

### 1.2 Core Types [P]
- [ ] `[M]` Define interfaces for {Component 1}
- [ ] `[M]` Define interfaces for {Component 2}

---

## Phase 2: Core Implementation

### 2.1 {Component Name}
- [ ] `[M]` Implement {function 1}
- [ ] `[M]` Implement {function 2}
- [ ] `[S]` Add unit tests

### 2.2 {Component Name} [P]
- [ ] `[L]` Implement {complex feature}
- [ ] `[M]` Add error handling
- [ ] `[S]` Add unit tests

---

## Phase 3: Integration

### 3.1 Wire Components
- [ ] `[M]` Connect {Component 1} to {Component 2}
- [ ] `[S]` Add integration tests

### 3.2 Final Validation
- [ ] `[S]` Run full test suite
- [ ] `[S]` Verify acceptance criteria
- [ ] `[S]` Update documentation

---

## Dependencies

```
1.1 Setup
  └── 1.2 Core Types [P]
        ├── 2.1 Component 1
        └── 2.2 Component 2 [P]
              └── 3.1 Wire Components
                    └── 3.2 Final Validation
```

## Notes

- {Any important notes about task execution}
```

$ARGUMENTS
