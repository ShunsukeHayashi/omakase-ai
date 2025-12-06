# Specification: Comprehensive Codebase Refactoring

**Created**: 2025-12-06
**Status**: Draft
**Branch**: feature/comprehensive-refactoring

## Overview

Full-stack refactoring of the omakase-ai codebase targeting architecture, code quality, performance, and API/interface improvements. The primary driver is maintainability - making the codebase easier to understand, modify, and extend.

### Current State Analysis

| Component | Files | Lines | Issues |
|-----------|-------|-------|--------|
| Core Source (`src/`) | 23 files | ~6,400 lines | Mixed concerns, weak typing |
| Agent System (`.claude/agents/`) | 13 agents | ~3,000 lines | Documentation-only, no runtime code |
| MCP Servers (`.claude/mcp-servers/`) | 8 servers | Mixed JS/TS | Inconsistent patterns, 38MB node_modules |
| Skills (`.claude/skills/`) | 7 skills | ~700 lines | Good structure |
| Commands (`.claude/commands/`) | 15 commands | ~1,500 lines | Overlapping functionality |

## User Scenarios

### P1 - Critical

- [ ] As a developer, I want clear module boundaries so that I can modify one component without affecting others
  - **Test Approach**: Dependency graph analysis, import cycle detection

- [ ] As a developer, I want consistent coding patterns so that I can understand any part of the codebase quickly
  - **Test Approach**: ESLint/TypeScript strict checks pass with 0 errors

- [ ] As a maintainer, I want reduced complexity so that new features can be added without regression risk
  - **Test Approach**: Cyclomatic complexity < 10 per function

### P2 - Important

- [ ] As a developer, I want strong TypeScript types so that the compiler catches errors before runtime
  - **Test Approach**: `strict: true` in tsconfig, no `any` types

- [ ] As a developer, I want unified MCP server patterns so that creating new servers is straightforward
  - **Test Approach**: Template-based server creation succeeds

- [ ] As a user, I want faster startup time so that development iteration is quick
  - **Test Approach**: Server cold start < 3 seconds

### P3 - Nice to have

- [ ] As a developer, I want auto-generated documentation so that API changes are always documented
  - **Test Approach**: TypeDoc generates without errors

- [ ] As a contributor, I want example implementations so that I can learn patterns quickly
  - **Test Approach**: README examples are executable

## Acceptance Criteria

### Scenario 1: Module Import Cleanup
- **Given** the refactored codebase
- **When** I run `madge --circular src/`
- **Then** zero circular dependencies are detected

### Scenario 2: TypeScript Strictness
- **Given** the refactored codebase
- **When** I run `npm run typecheck`
- **Then** zero errors are reported with strict mode enabled

### Scenario 3: MCP Server Consistency
- **Given** a new MCP server requirement
- **When** I copy the template and implement handlers
- **Then** the server follows the established pattern and passes tests

### Scenario 4: Performance Baseline
- **Given** the refactored server
- **When** I measure cold start time
- **Then** the server is ready within 3 seconds

### Scenario 5: Test Coverage
- **Given** the refactored codebase
- **When** I run `npm run test:coverage`
- **Then** coverage is >= 80% for all modules

## Requirements

### Architecture Refactoring

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Implement clean module boundaries with explicit public APIs | Must |
| FR-002 | Extract shared utilities into `src/lib/` | Must |
| FR-003 | Consolidate agent definitions into single source of truth | Must |
| FR-004 | Unify MCP server implementations (all TypeScript) | Should |
| FR-005 | Create dependency injection pattern for services | Should |
| FR-006 | Implement barrel exports for cleaner imports | Could |

### Code Quality Improvements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-010 | Enable TypeScript `strict: true` with no `any` types | Must |
| FR-011 | Add JSDoc comments to all public functions | Must |
| FR-012 | Reduce function cyclomatic complexity to < 10 | Should |
| FR-013 | Eliminate dead code and unused dependencies | Should |
| FR-014 | Standardize error handling patterns | Should |
| FR-015 | Implement consistent naming conventions | Should |

### Performance Optimizations

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-020 | Lazy load MCP servers on demand | Should |
| FR-021 | Optimize node_modules (38MB -> target < 10MB) | Should |
| FR-022 | Implement caching for scraper results | Could |
| FR-023 | Add connection pooling for external APIs | Could |

### API/Interface Improvements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-030 | Create TypeScript interfaces for all API payloads | Must |
| FR-031 | Version API endpoints (`/api/v1/...`) | Should |
| FR-032 | Add OpenAPI/Swagger documentation | Should |
| FR-033 | Implement consistent error response format | Should |
| FR-034 | Add request validation middleware | Should |

## Success Criteria

| ID | Metric | Target |
|----|--------|--------|
| SC-001 | Circular dependencies | 0 |
| SC-002 | TypeScript strict mode errors | 0 |
| SC-003 | Test coverage | >= 80% |
| SC-004 | Function cyclomatic complexity | < 10 avg |
| SC-005 | Cold start time | < 3 seconds |
| SC-006 | MCP servers node_modules | < 10 MB |
| SC-007 | Public functions with JSDoc | 100% |
| SC-008 | ESLint warnings | 0 |

## Refactoring Phases

### Phase 1: Foundation (Week 1-2)

**Target**: Establish patterns and fix critical issues

1. Enable TypeScript strict mode incrementally
2. Fix circular dependencies in `src/`
3. Create shared types in `src/types/`
4. Add barrel exports (`index.ts`) to each module
5. Set up baseline metrics collection

**Deliverables**:
- [ ] `tsconfig.json` with `strict: true`
- [ ] Zero circular dependencies
- [ ] Shared types documented

### Phase 2: Core Refactoring (Week 3-4)

**Target**: Clean up `src/` structure

1. Extract services into `src/services/`
2. Extract routes into `src/routes/`
3. Create `src/lib/` for utilities
4. Implement dependency injection
5. Add comprehensive error handling

**Proposed Structure**:
```
src/
├── index.ts              # Main entry point
├── config/               # Configuration management
│   ├── index.ts
│   └── env.ts
├── types/                # Shared TypeScript types
│   ├── index.ts
│   ├── api.ts
│   ├── agents.ts
│   └── services.ts
├── lib/                  # Shared utilities
│   ├── index.ts
│   ├── logger.ts
│   ├── errors.ts
│   └── validation.ts
├── services/             # Business logic
│   ├── index.ts
│   ├── scraper/
│   ├── knowledge/
│   ├── store/
│   └── cart/
├── routes/               # API routes
│   ├── index.ts
│   ├── v1/
│   └── middleware/
├── agents/               # Agent implementations
│   ├── index.ts
│   └── prompts.ts
└── websocket/            # WebSocket handlers
    └── handler.ts
```

### Phase 3: MCP Server Consolidation (Week 5-6)

**Target**: Unify MCP server patterns

1. Convert all `.js` servers to TypeScript
2. Create shared MCP utilities
3. Implement server template
4. Reduce node_modules bloat
5. Add MCP server tests

**Current State**:
```
mcp-servers/
├── *.js files (4 legacy)     # Convert to TS
├── gemini-image-gen/         # 38MB node_modules
├── gemini-slide-gen/
├── miyabi-investment-society/
└── miyabi-tmux/              # TypeScript ✓
```

**Target State**:
```
mcp-servers/
├── shared/                   # Shared utilities
│   ├── types.ts
│   ├── base-server.ts
│   └── test-utils.ts
├── ide/                      # Renamed from ide-integration
├── github/                   # Renamed from github-enhanced
├── gemini-image/             # Optimized dependencies
├── gemini-slide/
├── investment/               # Renamed
├── tmux/                     # Already TS
├── project-context/
└── tradingview/
```

### Phase 4: Agent System Cleanup (Week 7-8)

**Target**: Consolidate agent definitions

1. Create single source of truth for agent configs
2. Remove duplicate documentation
3. Add runtime agent validation
4. Implement agent test harness

**Issues Identified**:
- 13 agent markdown files with overlapping content
- No runtime validation of agent behavior
- Inconsistent escalation paths

### Phase 5: Command/Skill Optimization (Week 9-10)

**Target**: Reduce overlap, improve DX

1. Audit command overlap
2. Merge similar commands
3. Add command completion hints
4. Improve skill auto-trigger accuracy

**Overlapping Commands to Merge**:
- `/verify` + `/test` → `/check`
- `/miyabi-agent` + `/agent-run` → `/run`
- `/miyabi-status` + Status in others → Single status source

## Edge Cases

- **Circular dependency in tests**: May require test restructuring
- **MCP server breaking changes**: Need backward compatibility layer
- **Legacy JS consumers**: Provide migration guide
- **Large file refactoring**: May need incremental commits

## Technical Debt Items

1. **Console.warn in production code** (`src/index.ts:12`)
2. **ESLint disable comments** (`src/server/index.ts:94-98`)
3. **Hardcoded values** (port, timeout values scattered)
4. **Missing error boundaries** in async operations
5. **No request timeout** on scraper operations

## Migration Strategy

1. **Backward Compatibility**: Keep old imports working via re-exports
2. **Feature Flags**: Use env vars to toggle new implementations
3. **Incremental Rollout**: Merge in small, reviewable PRs
4. **Rollback Plan**: Each phase independently revertable

## Open Questions

- [NEEDS CLARIFICATION] Should MCP servers be moved to a separate package?
- [NEEDS CLARIFICATION] Target Node.js version for the refactor?
- [NEEDS CLARIFICATION] Should we add runtime type validation (Zod/io-ts)?
- [NEEDS CLARIFICATION] Priority between performance vs maintainability trade-offs?

## Dependencies

- TypeScript >= 5.0
- Node.js >= 18 (for native fetch)
- Vitest for testing
- ESLint + Prettier for code style

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes to API | High | Medium | Version API, deprecation notices |
| Test coverage regression | Medium | Low | Block merges below 80% |
| Performance regression | Medium | Low | Benchmark before/after |
| Team learning curve | Low | Medium | Documentation, examples |

---

## Appendix: Current Architecture Diagram

```
                    ┌─────────────────┐
                    │   CLAUDE.md     │
                    │  (Entry Point)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Commands     │ │     Skills      │ │     Agents      │
│  (15 .md files) │ │  (7 SKILL.md)   │ │  (13 .md files) │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   MCP Servers   │
                    │  (8 servers)    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    src/         │
                    │  (Express API)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Services     │ │     Routes      │ │    WebSocket    │
│  (scraper,etc)  │ │  (7 routers)    │ │   (voice)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

**Generated by**: Claude Code Spec Agent
**Template**: Spec-Driven Development v1.0
