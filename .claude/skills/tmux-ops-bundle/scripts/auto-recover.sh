#!/bin/bash
# auto-recover.sh - Automatic agent recovery with smart detection
# Usage: bash ./scripts/auto-recover.sh [SESSION] [--watch]

SESSION=${1:-"omakaseai"}
WATCH_MODE=false
THRESHOLD=10

# Check for --watch flag
for arg in "$@"; do
    if [ "$arg" = "--watch" ]; then
        WATCH_MODE=true
    fi
done

R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
C='\033[0;36m'
W='\033[1;37m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

recover_pane() {
    local pane=$1
    local ctx=$2
    local reason=$3
    
    log "${Y}🔧 Recovering $pane (${reason})${NC}"
    
    case $reason in
        "low_context")
            tmux send-keys -t "$pane" "/clear" Enter
            sleep 0.5
            log "${G}✅ Cleared $pane${NC}"
            ;;
        "unresponsive")
            tmux respawn-pane -t "$pane" -k
            sleep 1
            tmux send-keys -t "$pane" "claude --dangerously-skip-permissions" Enter
            sleep 2
            log "${G}✅ Respawned $pane${NC}"
            ;;
        "dead")
            # Try to recreate
            log "${Y}⚠️ Pane $pane appears dead, attempting recovery...${NC}"
            tmux respawn-pane -t "$pane" -k 2>/dev/null || {
                log "${R}❌ Could not recover $pane${NC}"
                return 1
            }
            sleep 1
            tmux send-keys -t "$pane" "claude --dangerously-skip-permissions" Enter
            sleep 2
            log "${G}✅ Recovered $pane${NC}"
            ;;
    esac
    
    return 0
}

check_and_recover() {
    local recovered=0
    
    log "${C}🔍 Checking session: $SESSION${NC}"
    
    if ! tmux has-session -t $SESSION 2>/dev/null; then
        log "${R}❌ Session $SESSION not found${NC}"
        return 1
    fi
    
    for pane in $(tmux list-panes -t $SESSION -F "#{pane_id}" 2>/dev/null); do
        # Get context level
        ctx=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -5 | \
              grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
        ctx=${ctx:-100}
        
        # Get current command
        cmd=$(tmux display-message -t "$pane" -p "#{pane_current_command}" 2>/dev/null)
        
        # Check for issues
        if [ "$ctx" -lt $THRESHOLD ]; then
            recover_pane "$pane" "$ctx" "low_context"
            recovered=$((recovered + 1))
        elif [ "$cmd" = "zsh" ] || [ "$cmd" = "bash" ]; then
            # Shell instead of Claude - might need restart
            log "${Y}⚠️ $pane running shell instead of Claude${NC}"
            
            # Check if user wants auto-restart
            if [ "$WATCH_MODE" = true ]; then
                recover_pane "$pane" "$ctx" "unresponsive"
                recovered=$((recovered + 1))
            else
                log "${DIM}   Run with --watch to auto-restart${NC}"
            fi
        fi
    done
    
    if [ $recovered -gt 0 ]; then
        log "${G}✅ Recovered $recovered agent(s)${NC}"
    else
        log "${G}✅ All agents healthy${NC}"
    fi
    
    return 0
}

# Main
echo -e "${C}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║${NC}  ${W}🔧 MIYABI AUTO-RECOVERY${NC}                                     ${C}║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$WATCH_MODE" = true ]; then
    log "${C}👀 Watch mode enabled - checking every 30s${NC}"
    log "${DIM}Press Ctrl+C to stop${NC}"
    echo ""
    
    while true; do
        check_and_recover
        echo ""
        sleep 30
    done
else
    check_and_recover
    echo ""
    log "${DIM}Run with --watch for continuous monitoring${NC}"
fi
