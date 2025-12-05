# Multi-Agent System Configuration - Pixel Termux

**Version**: 1.0.0  
**Purpose**: Unified multi-agent workflow across Pixel-MUGEN-MacBook  
**Pattern**: OpenAI Dev Day - Auto-Loop until perfect quality

---

## Overview

Codex uses **verification scripts + auto-loop** for perfect quality:

1. Execute task
2. Run verification script
3. If fail, analyze and iterate
4. Repeat until all checks pass (max 5 iterations)
5. Mark complete only when verified

Unique terminology: "**exec verify**" for automatic verification loops.

---

## Available Agents

### 1. Mobile Orchestrator Agent (Pixel Termux - このマシン)
Role: Gateway and coordination hub  
Tools:
- SSH to remote machines
- Claude Code mobile interface
- Termux:Widget shortcuts
- Notification system

Workflows:
```bash
# Check all machines
exec verify ssh_status

# Coordinate deployment
exec plan deploy_issue <number>

# Monitor execution
exec review pr_check
```

### 2. Development Agent (MUGEN/MAJIN)
Role: Heavy development and compilation  
Tools:
- Cargo/Rust (571 crates)
- Git + GitHub CLI
- tmux (persistent sessions)
- Claude Code server mode

Workflows:
```bash
# On MUGEN
exec verify cargo_build
exec verify cargo_test
exec review pr_changes
```

### 3. Worker Agents (PR Workers 1-4)
Role: Parallel PR processing  
Tools:
- Independent git clones
- Isolated compilation
- Concurrent testing

Workflows:
```bash
# Worker assignment
exec plan assign_worker <pr_number> <worker_id>
```

### 4. Review Agent (MacBook / Pixel)
Role: Code review and quality assurance  
Tools:
- gh pr review
- git diff analysis
- Claude Code analysis

Workflows:
```bash
exec review pr_quality
```

### 5. Codex-Guide Sub-Agent (Guidance & Governance)
Role: Maintain Codex CLI settings, enforce best practices, and publish quick-start guides for operators.  
Tools:
- Access to `~/.codex/config.toml`, `AGENTS.md`, and templates
- exec verify for validation loops
- Git/GitHub for sharing guides

Workflows:
```bash
# Audit current setup
cd ~/.codex && exec verify ./hooks/audit_codex.sh

# Publish or refresh guidance
cd ~/.codex && ./hooks/publish_guide.sh codex-guide

# Quick health check
cd ~/.codex && exec verify ./hooks/check_integrity.sh
```

---

## Verification Patterns

### Auto-Loop Pattern
```typescript
async function execVerify(task: Task): Promise<Result> {
  const MAX_ITERATIONS = 5;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    const result = await executeTask(task);
    const verification = await verifyResult(result);

    if (verification.passed) {
      return result; // Success!
    }

    // Analyze failure and iterate
    task = await analyzeAndImprove(task, verification);
    iteration++;
  }

  throw new Error('Max iterations reached');
}
```

### Verification Commands

#### For Rust/Cargo (MUGEN)
```bash
cargo check              # Syntax verification
cargo build             # Build verification
cargo test              # Test verification
cargo clippy            # Lint verification
```

#### For TypeScript (Pixel)
```bash
npm run build           # Build verification
npm test               # Test verification
tsc --noEmit          # Type verification
```

#### For Git/GitHub
```bash
git diff --check       # Conflict verification
gh pr checks          # CI verification
gh pr review          # Review verification
```

---

## Exec Commands

### exec verify
```bash
# Automatic verification loop
exec verify <command>

# Example
exec verify cargo build
exec verify npm test
```

### exec plan
```bash
# Multi-step execution with planning
exec plan <workflow>

# Example
exec plan deploy_issue 856
exec plan review_pr 818
```

### exec review
```bash
# Review loop with feedback
exec review <target>

# Example
exec review pr 856
exec review code changes
```

---

## Inter-Agent Communication (A2A)

### Pixel → MUGEN
```bash
# SSH-based A2A
ssh mugen 'cd ~/miyabi-private && exec verify cargo build'
```

### MUGEN → Pixel (Notification)
```bash
# Callback notification
termux-notification --title "Build Complete" --content "Issue #856 ready"
```

### MacBook ↔ Pixel ↔ MUGEN
```bash
# Multi-hop coordination
ssh pixel 'ssh mugen "exec plan deploy"'
```

---

## Agent Status Tracking

### Check Agent Status
```bash
# Pixel
cat ~/.codex/agent.md

# MUGEN
ssh mugen 'cat ~/.codex/agent.md'

# All agents
~/tmp/ssh_check.sh
```

### Agent Health
```bash
# CPU/Memory
jcpu

# Processes
ps aux | grep -E "(claude|codex|miyabi)"

# Connections
ss -tn | grep :22
```

---

## Quick Start

### 1. Initialize Codex
```bash
# On Pixel
cd ~/.codex
cat agent.md  # Verify configuration
```

### 2. Test Verification
```bash
# Simple test
exec verify echo "test"

# Build test
cd ~/Projects/miyabi-mobile
exec verify npm run build
```

### 3. A2A Test
```bash
# Pixel → MUGEN
ssh mugen 'echo "A2A working"'
```

---

Multi-Agent System Ready 🌸🤖🚀

All agents configured and ready for unified Codex CLI workflows!
