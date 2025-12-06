#!/bin/bash
# health-check.sh - Comprehensive system health check
# Usage: bash ./scripts/health-check.sh [SESSION]

SESSION=${1:-"omakaseai"}

R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
C='\033[0;36m'
W='\033[1;37m'
NC='\033[0m'

echo -e "${C}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║${NC}  ${W}🏥 MIYABI HEALTH CHECK${NC}                $(date '+%Y-%m-%d %H:%M:%S')  ${C}║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Session Check
echo -e "${W}1. Session Status${NC}"
echo -e "────────────────────────────────────────────────────────"
if tmux has-session -t $SESSION 2>/dev/null; then
    windows=$(tmux list-windows -t $SESSION 2>/dev/null | wc -l)
    panes=$(tmux list-panes -t $SESSION 2>/dev/null | wc -l)
    echo -e "   Session: ${G}✅ $SESSION${NC}"
    echo -e "   Windows: ${W}$windows${NC}"
    echo -e "   Panes:   ${W}$panes${NC}"
else
    echo -e "   Session: ${R}❌ $SESSION not found${NC}"
fi
echo ""

# 2. Agent Health
echo -e "${W}2. Agent Health${NC}"
echo -e "────────────────────────────────────────────────────────"

CRITICAL=0
WARNING=0
HEALTHY=0

for pane in $(tmux list-panes -t $SESSION -F "#{pane_id}" 2>/dev/null); do
    pane_num=${pane#%}
    ctx=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -5 | \
          grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
    ctx=${ctx:-100}
    
    cmd=$(tmux display-message -t "$pane" -p "#{pane_current_command}" 2>/dev/null)
    
    if [ "$ctx" -lt 10 ]; then
        status="${R}🔴 CRITICAL${NC}"
        CRITICAL=$((CRITICAL + 1))
    elif [ "$ctx" -lt 30 ]; then
        status="${Y}🟡 WARNING${NC}"
        WARNING=$((WARNING + 1))
    else
        status="${G}🟢 HEALTHY${NC}"
        HEALTHY=$((HEALTHY + 1))
    fi
    
    printf "   %s │ %3s%% │ %-12s │ %s\n" "$pane" "$ctx" "$cmd" "$status"
done

echo ""
echo -e "   Summary: ${G}$HEALTHY healthy${NC}, ${Y}$WARNING warning${NC}, ${R}$CRITICAL critical${NC}"
echo ""

# 3. System Resources
echo -e "${W}3. System Resources${NC}"
echo -e "────────────────────────────────────────────────────────"

# CPU (macOS compatible)
cpu_usage=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.1f", s/10}')
echo -e "   CPU Usage:    ${W}${cpu_usage}%${NC}"

# Memory
if command -v vm_stat &> /dev/null; then
    # macOS
    pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
    pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
    mem_used=$((pages_active * 4096 / 1024 / 1024 / 1024))
    echo -e "   Memory Used:  ${W}${mem_used}GB${NC} (macOS file cache normal)"
else
    # Linux
    mem_used=$(free -g | awk '/Mem:/ {print $3}')
    echo -e "   Memory Used:  ${W}${mem_used}GB${NC}"
fi

# Disk
disk_usage=$(df -h / | awk 'NR==2 {print $5}')
echo -e "   Disk Usage:   ${W}${disk_usage}${NC}"

# Claude processes
claude_procs=$(pgrep -f "claude" | wc -l | tr -d ' ')
echo -e "   Claude Procs: ${W}${claude_procs}${NC}"

echo ""

# 4. MCP Servers (if available)
echo -e "${W}4. MCP Servers${NC}"
echo -e "────────────────────────────────────────────────────────"
mcp_count=$(ps aux | grep -E "mcp|miyabi.*server" | grep -v grep | wc -l | tr -d ' ')
if [ "$mcp_count" -gt 0 ]; then
    echo -e "   MCP Servers:  ${G}✅ $mcp_count running${NC}"
else
    echo -e "   MCP Servers:  ${Y}⚠️ None detected${NC}"
fi
echo ""

# 5. Recommendations
echo -e "${W}5. Recommendations${NC}"
echo -e "────────────────────────────────────────────────────────"

if [ "$CRITICAL" -gt 0 ]; then
    echo -e "   ${R}⚠️ $CRITICAL agent(s) need immediate /clear${NC}"
fi

if [ "$WARNING" -gt 0 ]; then
    echo -e "   ${Y}⚠️ $WARNING agent(s) running low on context${NC}"
fi

if [ "$CRITICAL" -eq 0 ] && [ "$WARNING" -eq 0 ]; then
    echo -e "   ${G}✅ All systems nominal${NC}"
fi

echo ""
echo -e "${C}═══════════════════════════════════════════════════════════════${NC}"
