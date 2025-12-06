# Quick Reference Card

## 🚀 Session Commands

```bash
# Create new session
./scripts/create-agent-session.sh SESSION_NAME /path/to/project

# Connect to session
tmux attach -t SESSION_NAME

# Detach (inside tmux)
Ctrl+b d

# Kill session
tmux kill-session -t SESSION_NAME

# List sessions
tmux list-sessions
```

## 📊 Monitoring

```bash
# Interactive tracker
bash ./scripts/agent-tracker.sh

# Quick status
bash ./scripts/status.sh

# Custom panes
bash ./scripts/status.sh 53 55 56 57
```

## 🔧 Recovery

```bash
# Clear all agents
bash ./scripts/clear-all.sh

# Recover unresponsive
bash ./scripts/recover-agents.sh SESSION_NAME

# Restart single agent
tmux send-keys -t %PANE "/clear" Enter
```

## 📢 Communication

```bash
# Broadcast to all
bash ./scripts/broadcast.sh "【通知】タスク開始"

# Send to specific pane (P0.2 protocol)
tmux send-keys -t %53 'MESSAGE' && sleep 0.5 && tmux send-keys -t %53 Enter
```

## ⌨️ Tracker Shortcuts

| Key | Action |
|-----|--------|
| `q` | Quit tracker |
| `r` | Force refresh |
| `c` | Clear ALL agents |
| `1` | Clear しきるん (%53) |
| `2` | Clear カエデ (%55) |
| `3` | Clear サクラ (%56) |
| `4` | Clear ツバキ (%57) |
| `t` | Send task to しきるん |
| `b` | Broadcast to all |

## 🎯 Agent Mapping

| Pane | Agent | Role |
|------|-------|------|
| %53 | しきるん | Conductor |
| %55 | カエデ | CodeGen |
| %56 | サクラ | Review |
| %57 | ツバキ | Deploy |

## ⚠️ Context Levels

| Level | Status | Action |
|-------|--------|--------|
| 30%+ | 🟢 OK | Continue |
| 10-29% | 🟡 LOW | Monitor |
| <10% | 🔴 CRITICAL | `/clear` immediately |
