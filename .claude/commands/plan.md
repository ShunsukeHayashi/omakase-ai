# Implementation Plan Command

Create a technical implementation plan from an existing specification.

## Instructions

1. Read the specification from `docs/specs/{feature-name}.md`
2. Verify alignment with project constitution (CLAUDE.md)
3. Generate an implementation plan with:
   - Technical approach summary
   - Architecture decisions
   - Component breakdown
   - Dependencies and integrations
   - Testing strategy
   - Risk assessment

4. Save to `docs/plans/{feature-name}-plan.md`

## Constitution Check

Before proceeding, verify:
- [ ] Article I: Spec exists and is complete
- [ ] Article II: Test strategy defined first
- [ ] Article III: Solution uses minimal complexity
- [ ] Article IV: Components are standalone where possible
- [ ] Article V: Integration testing approach defined

## Template

```markdown
# Implementation Plan: {Feature Name}

**Spec**: docs/specs/{feature-name}.md
**Created**: {Date}
**Status**: Draft

## Summary

**Primary Requirement**: {One sentence}
**Technical Approach**: {One sentence}

## Constitution Alignment

| Article | Aligned | Notes |
|---------|---------|-------|
| I - Spec-Driven | Yes/No | {Notes} |
| II - Test-First | Yes/No | {Notes} |
| III - Simplicity | Yes/No | {Notes} |
| IV - Library-First | Yes/No | {Notes} |
| V - Integration Testing | Yes/No | {Notes} |

## Technical Context

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Framework**: {If applicable}
- **Testing**: Jest
- **Dependencies**: {List key dependencies}

## Architecture

### Components

1. **{Component Name}**
   - Purpose: {What it does}
   - Interface: {Key methods/APIs}
   - Dependencies: {What it needs}

### Data Flow

```
{Input} → {Process} → {Output}
```

## Implementation Phases

### Phase 1: Foundation
- {Task 1}
- {Task 2}

### Phase 2: Core Logic
- {Task 3}
- {Task 4}

### Phase 3: Integration
- {Task 5}
- {Task 6}

## Testing Strategy

### Unit Tests
- {Test case 1}
- {Test case 2}

### Integration Tests
- {Test case 1}
- {Test case 2}

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {Risk 1} | Low/Med/High | Low/Med/High | {Mitigation} |

## Complexity Tracking

| Violation | Justification |
|-----------|---------------|
| {If any} | {Why necessary} |
```

$ARGUMENTS
