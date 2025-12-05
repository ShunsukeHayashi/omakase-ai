# Specification Command

Create a new feature specification following Spec-Driven Development principles.

## Instructions

1. Ask the user for the feature name and description
2. Generate a specification document with:
   - Feature overview
   - User scenarios (P1, P2, P3 priorities)
   - Acceptance criteria (Given/When/Then)
   - Functional requirements (FR-001, FR-002, etc.)
   - Success criteria with measurable metrics
   - Edge cases and boundary conditions

3. Mark any ambiguities with `[NEEDS CLARIFICATION]`
4. Save to `docs/specs/{feature-name}.md`

## Template

```markdown
# Specification: {Feature Name}

**Created**: {Date}
**Status**: Draft
**Branch**: feature/{feature-id}

## Overview
{Brief description of what this feature does and why}

## User Scenarios

### P1 - Critical
- [ ] As a {role}, I want to {action} so that {benefit}
  - **Test Approach**: {How to verify independently}

### P2 - Important
- [ ] ...

### P3 - Nice to have
- [ ] ...

## Acceptance Criteria

### Scenario 1: {Name}
- **Given** {precondition}
- **When** {action}
- **Then** {expected result}

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | {Description} | Must |
| FR-002 | {Description} | Should |

## Success Criteria

| ID | Metric | Target |
|----|--------|--------|
| SC-001 | {What to measure} | {Quantifiable target} |

## Edge Cases
- {Edge case 1}
- {Edge case 2}

## Open Questions
- [NEEDS CLARIFICATION] {Question}
```

$ARGUMENTS
