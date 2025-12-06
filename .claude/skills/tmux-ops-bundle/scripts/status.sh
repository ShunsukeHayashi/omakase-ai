#!/bin/bash
# status.sh - Quick agent status check (one-shot)
# Usage: ./status.sh [PANE1] [PANE2] [PANE3] [PANE4]

P1=${1:-53}
P2=${2:-55}
P3=${3:-56}
P4=${4:-57}

# Colors
R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
C='\033[0;36m'
NC='\033[0m'

echo -e "${C}═══════════════════════════════════════════════════${NC}"
echo -e "${C}  🎯 Agent Status - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${C}═══════════════════════════════════════════════════${NC}"

declare -A NAMES
NAMES[$P1]="しきるん (Conductor)"
NAMES[$P2]="カエデ (CodeGen)"
NAMES[$P3]="サクラ (Review)"
NAMES[$P4]="ツバキ (Deploy)"

for pane in $P1 $P2 $P3 $P4; do
    ctx=$(tmux capture-pane -t "%$pane" -p 2>/dev/null | tail -5 | \
          grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
    ctx=${ctx:-100}
    
    # Color based on context
    if [ "$ctx" -lt 10 ]; then
        color=$R
        status="🔴 CRITICAL"
    elif [ "$ctx" -lt 30 ]; then
        color=$Y
        status="🟡 LOW"
    else
        color=$G
        status="🟢 OK"
    fi
    
    printf " ${C}%-25s${NC} │ %$pane │ ${color}%3s%%${NC} │ %s\n" \
           "${NAMES[$pane]}" "$ctx" "$status"
done

echo -e "${C}═══════════════════════════════════════════════════${NC}"

# Warning for critical agents
CRITICAL=0
for pane in $P1 $P2 $P3 $P4; do
    ctx=$(tmux capture-pane -t "%$pane" -p 2>/dev/null | tail -5 | \
          grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
    ctx=${ctx:-100}
    if [ "$ctx" -lt 10 ]; then
        CRITICAL=1
    fi
done

if [ "$CRITICAL" -eq 1 ]; then
    echo ""
    echo -e "${R}⚠️  Some agents have critical context levels!${NC}"
    echo -e "   Run: ${Y}./clear-all.sh${NC} or press ${Y}c${NC} in tracker"
fi
