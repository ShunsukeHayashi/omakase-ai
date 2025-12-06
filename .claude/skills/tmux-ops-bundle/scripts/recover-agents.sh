#!/bin/bash
# recover-agents.sh - Recover unresponsive agents
# Usage: ./recover-agents.sh [SESSION_NAME]

SESSION=${1:-"omakaseai"}

echo "🔧 Recovering agents in session: $SESSION"

# Check if session exists
if ! tmux has-session -t $SESSION 2>/dev/null; then
    echo "❌ Session '$SESSION' not found"
    echo "   Run: ./create-agent-session.sh $SESSION"
    exit 1
fi

# Get all panes
PANES=$(tmux list-panes -t $SESSION -F "#{pane_id}:#{pane_current_command}")

echo ""
echo "Current pane status:"
echo "────────────────────────────────────────"

for entry in $PANES; do
    pane_id=$(echo $entry | cut -d: -f1)
    command=$(echo $entry | cut -d: -f2)
    
    # Check context level
    ctx=$(tmux capture-pane -t $pane_id -p 2>/dev/null | tail -5 | \
          grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
    ctx=${ctx:-"N/A"}
    
    echo " $pane_id: $command (Context: $ctx%)"
    
    # Recovery logic
    if [ "$ctx" != "N/A" ] && [ "$ctx" -lt 5 ]; then
        echo "   ⚠️  Critical context! Clearing..."
        tmux send-keys -t $pane_id "/clear" Enter
        sleep 0.5
    elif [ "$command" = "zsh" ] || [ "$command" = "bash" ]; then
        echo "   🔄 Restarting Claude Code..."
        tmux send-keys -t $pane_id "claude --dangerously-skip-permissions" Enter
        sleep 1
    fi
done

echo ""
echo "✅ Recovery complete"
