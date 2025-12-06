#!/bin/bash
# Quick agent status check (one-shot)
# Usage: ./agent-status.sh

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🎯 omakaseai Agent Status${NC} - $(date '+%H:%M:%S')"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"

for pane in "%53" "%55" "%56" "%57"; do
    case $pane in
        "%53") agent="しきるん (Conductor)" ;;
        "%55") agent="カエデ (CodeGen)" ;;
        "%56") agent="サクラ (Review)" ;;
        "%57") agent="ツバキ (PR/Deploy)" ;;
    esac
    
    ctx=$(tmux capture-pane -t $pane -p 2>/dev/null | tail -5 | grep -oP 'auto-compact: \K\d+' | tail -1)
    [[ -z "$ctx" ]] && ctx="N/A"
    
    if [[ "$ctx" != "N/A" && $ctx -lt 10 ]]; then
        color=$RED
    elif [[ "$ctx" != "N/A" && $ctx -lt 30 ]]; then
        color=$YELLOW
    else
        color=$GREEN
    fi
    
    printf " ${CYAN}%-25s${NC} │ Context: ${color}%3s%%${NC}\n" "$agent" "$ctx"
done

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
