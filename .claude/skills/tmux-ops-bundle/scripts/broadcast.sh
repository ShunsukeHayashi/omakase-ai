#!/bin/bash
# broadcast.sh - Send message to all agents
# Usage: ./broadcast.sh "message" [PANE1] [PANE2] [PANE3] [PANE4]

MESSAGE=$1
P1=${2:-53}
P2=${3:-55}
P3=${4:-56}
P4=${5:-57}

if [ -z "$MESSAGE" ]; then
    echo "Usage: ./broadcast.sh \"message\" [pane1] [pane2] [pane3] [pane4]"
    exit 1
fi

echo "📢 Broadcasting: $MESSAGE"
echo ""

for pane in $P1 $P2 $P3 $P4; do
    echo "   → %$pane"
    tmux send-keys -t "%$pane" "$MESSAGE" Enter
    sleep 0.5
done

echo ""
echo "✅ Broadcast complete"
