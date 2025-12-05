# Architecture Context

## Overview

Omakase AI follows a Spec-Driven Development architecture where specifications drive all implementation decisions.

## Core Principles

### 1. Specification as Source of Truth

```
Specification → Plan → Tasks → Implementation → Validation
     ↑                                              |
     └──────────── Feedback Loop ──────────────────┘
```

### 2. Component Independence

Each component should be:
- Independently testable
- Independently deployable
- Loosely coupled
- Highly cohesive

### 3. Test Pyramid

```
       /\
      /  \        E2E Tests (少数)
     /----\
    /      \      Integration Tests (中程度)
   /--------\
  /          \    Unit Tests (多数)
 /------------\
```

## Directory Conventions

| Directory | Purpose | Naming |
|-----------|---------|--------|
| `src/` | Source code | camelCase |
| `tests/` | Test files | `*.test.ts` |
| `docs/specs/` | Specifications | `{feature-name}.md` |
| `docs/plans/` | Plans | `{feature-name}-plan.md` |
| `docs/tasks/` | Tasks | `{feature-name}-tasks.md` |

## Dependency Management

- Prefer peer dependencies over bundled
- Lock versions in production
- Regular security audits

## Error Handling

- Use typed errors
- Fail fast, fail loud
- Log with context
