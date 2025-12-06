#!/bin/bash
# agent-tracker-v2.sh - Advanced Agent Monitoring Dashboard
# Features: Auto-recovery, task queue, activity log, health alerts
# Usage: bash ./scripts/agent-tracker.sh [P1] [P2] [P3] [P4]

VERSION="2.0.0"
REFRESH=3
AUTO_RECOVER=true
ALERT_THRESHOLD=10

# Pane IDs (customizable)
P1=${1:-53}  # しきるん
P2=${2:-55}  # カエデ
P3=${3:-56}  # サクラ
P4=${4:-57}  # ツバキ

# Colors
R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
M='\033[0;35m'
W='\033[1;37m'
DIM='\033[2m'
NC='\033[0m'
BLINK='\033[5m'

# Agent names
declare -A NAMES
NAMES[$P1]="しきるん"
NAMES[$P2]="カエデ"
NAMES[$P3]="サクラ"
NAMES[$P4]="ツバキ"

declare -A ROLES
ROLES[$P1]="Conductor"
ROLES[$P2]="CodeGen"
ROLES[$P3]="Review"
ROLES[$P4]="Deploy"

# Stats tracking
declare -A LAST_CTX
ALERTS=()
RECOVERED=0

get_ctx() {
    local pane="%$1"
    local out=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -8)
    local ctx=$(echo "$out" | grep -o 'auto-compact: [0-9]*' | sed 's/auto-compact: //' | tail -1)
    echo "${ctx:-100}"
}

get_status() {
    local pane="%$1"
    local out=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -15)
    
    if echo "$out" | grep -qE "完了|Complete|DONE|finished"; then
        echo "✅"
    elif echo "$out" | grep -qE "Reading|Bash|Search|Working|Update|Writing|Searching"; then
        echo "🔄"
    elif echo "$out" | grep -qE "Error|error|failed|panic|FAIL"; then
        echo "❌"
    elif echo "$out" | grep -qE "Waiting|待機|idle|Idle"; then
        echo "⏸️"
    elif echo "$out" | grep -qE "bypass permissions"; then
        echo "🟢"
    else
        echo "💤"
    fi
}

color_ctx() {
    local ctx=$1
    if [ "$ctx" -lt 5 ]; then
        echo -e "${BLINK}${R}${ctx}%${NC}"
    elif [ "$ctx" -lt 10 ]; then
        echo -e "${R}${ctx}%${NC}"
    elif [ "$ctx" -lt 30 ]; then
        echo -e "${Y}${ctx}%${NC}"
    else
        echo -e "${G}${ctx}%${NC}"
    fi
}

get_activity() {
    local pane="%$1"
    local line=$(tmux capture-pane -t "$pane" -p 2>/dev/null | grep -v "^$" | grep -v "^>" | grep -v "bypass" | tail -1)
    echo "${line:0:50}"
}

auto_recover() {
    local pane=$1
    local ctx=$2
    
    if [ "$AUTO_RECOVER" = true ] && [ "$ctx" -lt 5 ]; then
        tmux send-keys -t "%$pane" "/clear" Enter
        sleep 0.5
        RECOVERED=$((RECOVERED + 1))
        ALERTS+=("$(date '+%H:%M:%S') ⚠️ Auto-recovered %$pane (was ${ctx}%)")
        return 0
    fi
    return 1
}

get_task_count() {
    local inbox="$HOME/.miyabi/dev_issues/inbox.jsonl"
    if [ -f "$inbox" ]; then
        local queued=$(grep -c '"status":"queued"' "$inbox" 2>/dev/null || echo 0)
        echo "$queued"
    else
        echo "0"
    fi
}

print_header() {
    echo -e "${C}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${C}║${NC}  ${M}🎯 MIYABI AGENT TRACKER${NC} ${DIM}v${VERSION}${NC}              $(date '+%Y-%m-%d %H:%M:%S')  ${C}║${NC}"
    echo -e "${C}╠══════════════════════════════════════════════════════════════════════════╣${NC}"
    
    # System stats
    local tasks=$(get_task_count)
    echo -e "${C}║${NC} ${DIM}Tasks: ${W}${tasks}${NC}${DIM} queued${NC}  │  ${DIM}Auto-recover: ${NC}$([ "$AUTO_RECOVER" = true ] && echo "${G}ON${NC}" || echo "${R}OFF${NC}")  │  ${DIM}Recovered: ${W}${RECOVERED}${NC}  ${C}║${NC}"
    echo -e "${C}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
}

print_agents() {
    local c1=$(get_ctx "$P1"); local s1=$(get_status "$P1")
    local c2=$(get_ctx "$P2"); local s2=$(get_status "$P2")
    local c3=$(get_ctx "$P3"); local s3=$(get_status "$P3")
    local c4=$(get_ctx "$P4"); local s4=$(get_status "$P4")
    
    # Auto-recover if needed
    auto_recover "$P1" "$c1"
    auto_recover "$P2" "$c2"
    auto_recover "$P3" "$c3"
    auto_recover "$P4" "$c4"
    
    echo ""
    echo -e "${B}┌───────────────────────────────────┬───────────────────────────────────┐${NC}"
    echo -e "${B}│${NC} ${Y}%${P1}${NC} ${C}${NAMES[$P1]}${NC} ${DIM}${ROLES[$P1]}${NC}           ${B}│${NC} ${Y}%${P2}${NC} ${C}${NAMES[$P2]}${NC} ${DIM}${ROLES[$P2]}${NC}             ${B}│${NC}"
    echo -e "${B}│${NC}  $s1 Context: $(color_ctx $c1)              ${B}│${NC}  $s2 Context: $(color_ctx $c2)              ${B}│${NC}"
    echo -e "${B}├───────────────────────────────────┼───────────────────────────────────┤${NC}"
    echo -e "${B}│${NC} ${Y}%${P3}${NC} ${C}${NAMES[$P3]}${NC} ${DIM}${ROLES[$P3]}${NC}             ${B}│${NC} ${Y}%${P4}${NC} ${C}${NAMES[$P4]}${NC} ${DIM}${ROLES[$P4]}${NC}              ${B}│${NC}"
    echo -e "${B}│${NC}  $s3 Context: $(color_ctx $c3)              ${B}│${NC}  $s4 Context: $(color_ctx $c4)              ${B}│${NC}"
    echo -e "${B}└───────────────────────────────────┴───────────────────────────────────┘${NC}"
}

print_activity() {
    echo ""
    echo -e "${W}📝 Latest Activity:${NC}"
    echo -e "${DIM}────────────────────────────────────────────────────────────────────────${NC}"
    echo -e " ${C}${NAMES[$P1]}${NC}: $(get_activity $P1)"
    echo -e " ${C}${NAMES[$P2]}${NC}: $(get_activity $P2)"
    echo -e " ${C}${NAMES[$P3]}${NC}: $(get_activity $P3)"
    echo -e " ${C}${NAMES[$P4]}${NC}: $(get_activity $P4)"
}

print_alerts() {
    if [ ${#ALERTS[@]} -gt 0 ]; then
        echo ""
        echo -e "${Y}⚠️ Recent Alerts:${NC}"
        local start=$((${#ALERTS[@]} - 3))
        [ $start -lt 0 ] && start=0
        for ((i=start; i<${#ALERTS[@]}; i++)); do
            echo -e " ${DIM}${ALERTS[$i]}${NC}"
        done
    fi
}

print_help() {
    echo ""
    echo -e "${DIM}────────────────────────────────────────────────────────────────────────${NC}"
    echo -e "${C}[q]${NC}uit ${C}[r]${NC}efresh ${C}[c]${NC}lear-all ${C}[1-4]${NC}clear-one ${C}[t]${NC}ask ${C}[b]${NC}roadcast ${C}[a]${NC}uto-toggle"
}

clear_all() {
    echo -e "\n${Y}Clearing all agents...${NC}"
    for p in $P1 $P2 $P3 $P4; do
        tmux send-keys -t "%$p" "/clear" Enter
        sleep 0.5
    done
    ALERTS+=("$(date '+%H:%M:%S') 🧹 Manual clear all")
    sleep 1
}

send_task() {
    echo -e "\n${Y}Task for ${NAMES[$P1]} (%$P1):${NC} "
    read -r task
    if [ -n "$task" ]; then
        tmux send-keys -t "%$P1" "$task" Enter
        ALERTS+=("$(date '+%H:%M:%S') 📤 Task sent: ${task:0:30}...")
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
        ALERTS+=("$(date '+%H:%M:%S') 📢 Broadcast: ${msg:0:30}...")
        sleep 1
    fi
}

toggle_auto() {
    if [ "$AUTO_RECOVER" = true ]; then
        AUTO_RECOVER=false
        ALERTS+=("$(date '+%H:%M:%S') 🔴 Auto-recover disabled")
    else
        AUTO_RECOVER=true
        ALERTS+=("$(date '+%H:%M:%S') 🟢 Auto-recover enabled")
    fi
}

# Main loop
while true; do
    clear
    print_header
    print_agents
    print_activity
    print_alerts
    print_help
    
    read -t $REFRESH -n 1 key 2>/dev/null
    case $key in
        q|Q) echo -e "\n${G}Goodbye!${NC}"; exit 0 ;;
        r|R) continue ;;
        c|C) clear_all ;;
        1) tmux send-keys -t "%$P1" "/clear" Enter; ALERTS+=("$(date '+%H:%M:%S') 🧹 Cleared %$P1") ;;
        2) tmux send-keys -t "%$P2" "/clear" Enter; ALERTS+=("$(date '+%H:%M:%S') 🧹 Cleared %$P2") ;;
        3) tmux send-keys -t "%$P3" "/clear" Enter; ALERTS+=("$(date '+%H:%M:%S') 🧹 Cleared %$P3") ;;
        4) tmux send-keys -t "%$P4" "/clear" Enter; ALERTS+=("$(date '+%H:%M:%S') 🧹 Cleared %$P4") ;;
        t|T) send_task ;;
        b|B) broadcast ;;
        a|A) toggle_auto ;;
    esac
done
