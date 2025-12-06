#!/bin/bash
# agent-tracker.sh - Real-time agent monitoring dashboard
# Usage: bash ./agent-tracker.sh [PANE1] [PANE2] [PANE3] [PANE4]

# Default pane IDs (override with arguments)
P1=${1:-53}
P2=${2:-55}
P3=${3:-56}
P4=${4:-57}

REFRESH=5

# Colors
R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
M='\033[0;35m'
W='\033[1;37m'
NC='\033[0m'

get_ctx() {
    local pane="%$1"
    local out=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -5)
    local ctx=$(echo "$out" | grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
    echo "${ctx:-100}"
}

get_status() {
    local pane="%$1"
    local out=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -10)
    
    if echo "$out" | grep -qE "完了|Complete|finished|DONE"; then
        echo "✅"
    elif echo "$out" | grep -qE "Reading|Bash|Search|Working|Update|Writing"; then
        echo "🔄"
    elif echo "$out" | grep -qE "Error|error|failed|panic"; then
        echo "❌"
    elif echo "$out" | grep -qE "Waiting|待機|idle"; then
        echo "⏸️"
    else
        echo "🟢"
    fi
}

color_ctx() {
    local ctx=$1
    if [ "$ctx" -lt 10 ]; then
        echo -e "${R}${ctx}%${NC}"
    elif [ "$ctx" -lt 30 ]; then
        echo -e "${Y}${ctx}%${NC}"
    else
        echo -e "${G}${ctx}%${NC}"
    fi
}

get_last_line() {
    local pane="%$1"
    tmux capture-pane -t "$pane" -p 2>/dev/null | grep -v "^$" | tail -1 | cut -c1-45
}

print_ui() {
    clear
    echo -e "${C}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${C}║${NC}  ${M}🎯 MIYABI AGENT TRACKER${NC}                   $(date '+%Y-%m-%d %H:%M:%S')  ${C}║${NC}"
    echo -e "${C}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Get all stats
    local c1=$(get_ctx "$P1"); local s1=$(get_status "$P1")
    local c2=$(get_ctx "$P2"); local s2=$(get_status "$P2")
    local c3=$(get_ctx "$P3"); local s3=$(get_status "$P3")
    local c4=$(get_ctx "$P4"); local s4=$(get_status "$P4")
    
    echo -e "${B}┌───────────────────────────────┬───────────────────────────────┐${NC}"
    echo -e "${B}│${NC} ${Y}%${P1}${NC} ${C}しきるん${NC} Conductor     ${B}│${NC} ${Y}%${P2}${NC} ${C}カエデ${NC} CodeGen         ${B}│${NC}"
    echo -e "${B}│${NC}  $s1 Context: $(color_ctx $c1)            ${B}│${NC}  $s2 Context: $(color_ctx $c2)            ${B}│${NC}"
    echo -e "${B}├───────────────────────────────┼───────────────────────────────┤${NC}"
    echo -e "${B}│${NC} ${Y}%${P3}${NC} ${C}サクラ${NC} Review          ${B}│${NC} ${Y}%${P4}${NC} ${C}ツバキ${NC} Deploy          ${B}│${NC}"
    echo -e "${B}│${NC}  $s3 Context: $(color_ctx $c3)            ${B}│${NC}  $s4 Context: $(color_ctx $c4)            ${B}│${NC}"
    echo -e "${B}└───────────────────────────────┴───────────────────────────────┘${NC}"
    
    # Activity preview
    echo ""
    echo -e "${W}📝 Latest Activity:${NC}"
    echo -e "${B}────────────────────────────────────────────────────────────────${NC}"
    echo -e " ${C}しきるん${NC}: $(get_last_line $P1)"
    echo -e " ${C}カエデ${NC}:   $(get_last_line $P2)"
    echo -e " ${C}サクラ${NC}:   $(get_last_line $P3)"
    echo -e " ${C}ツバキ${NC}:   $(get_last_line $P4)"
    
    # Commands
    echo ""
    echo -e "${B}────────────────────────────────────────────────────────────────${NC}"
    echo -e "${C}[q]${NC}uit ${C}[r]${NC}efresh ${C}[c]${NC}lear-all ${C}[1-4]${NC}clear-one ${C}[t]${NC}ask ${C}[b]${NC}roadcast"
}

clear_all() {
    echo -e "\n${Y}Clearing all agents...${NC}"
    for p in $P1 $P2 $P3 $P4; do
        tmux send-keys -t "%$p" "/clear" Enter
        sleep 0.5
    done
    echo -e "${G}Done.${NC}"
    sleep 1
}

send_task() {
    echo -e "\n${Y}Task for しきるん (%$P1):${NC} "
    read -r task
    if [ -n "$task" ]; then
        tmux send-keys -t "%$P1" "$task" Enter
        echo -e "${G}Sent.${NC}"
        sleep 1
    fi
}

broadcast() {
    echo -e "\n${Y}Broadcast message:${NC} "
    read -r msg
    if [ -n "$msg" ]; then
        for p in $P1 $P2 $P3 $P4; do
            tmux send-keys -t "%$p" "$msg" Enter
            sleep 0.3
        done
        echo -e "${G}Broadcast complete.${NC}"
        sleep 1
    fi
}

# Main loop
while true; do
    print_ui
    read -t $REFRESH -n 1 key 2>/dev/null
    case $key in
        q|Q) echo -e "\n${G}Goodbye!${NC}"; exit 0 ;;
        r|R) continue ;;
        c|C) clear_all ;;
        1) tmux send-keys -t "%$P1" "/clear" Enter ;;
        2) tmux send-keys -t "%$P2" "/clear" Enter ;;
        3) tmux send-keys -t "%$P3" "/clear" Enter ;;
        4) tmux send-keys -t "%$P4" "/clear" Enter ;;
        t|T) send_task ;;
        b|B) broadcast ;;
    esac
done
