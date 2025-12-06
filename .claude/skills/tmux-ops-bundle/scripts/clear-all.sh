#!/bin/bash
# clear-all.sh - Clear all agents to reset context
# Usage: ./clear-all.sh [PANE1] [PANE2] [PANE3] [PANE4]

P1=${1:-53}
P2=${2:-55}
P3=${3:-56}
P4=${4:-57}

echo "🧹 Clearing all agents..."

for pane in $P1 $P2 $P3 $P4; do
    echo "   → Clearing %$pane"
    tmux send-keys -t "%$pane" "/clear" Enter
    sleep 0.5
done

echo ""
echo "✅ All agents cleared"
echo "   Context restored to 100%"
