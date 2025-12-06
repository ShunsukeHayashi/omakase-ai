#!/bin/bash
# orchestrate.sh - Quick task orchestration helper
# Usage: bash ./scripts/orchestrate.sh "task description" [priority]

TASK="$1"
PRIORITY=${2:-"P2-Medium"}
P1=${3:-53}

C='\033[0;36m'
G='\033[0;32m'
Y='\033[1;33m'
W='\033[1;37m'
NC='\033[0m'

if [ -z "$TASK" ]; then
    echo -e "${Y}Usage: ./orchestrate.sh \"task description\" [priority]${NC}"
    echo -e "${W}Example: ./orchestrate.sh \"Fix navigation bug\" P1-High${NC}"
    exit 1
fi

echo -e "${C}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║${NC}  ${W}🎯 TASK ORCHESTRATION${NC}                                       ${C}║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${W}Task:${NC}     $TASK"
echo -e "${W}Priority:${NC} $PRIORITY"
echo -e "${W}Target:${NC}   しきるん (%$P1)"
echo ""

# Create DevIssue (if miyabi available)
if command -v miyabi &> /dev/null; then
    echo -e "${Y}Creating DevIssue...${NC}"
    miyabi a2a create --title "$TASK" --priority "${PRIORITY#P}" 2>/dev/null || true
fi

# Send to Conductor
echo -e "${Y}Sending to しきるん...${NC}"
MESSAGE="【新規タスク】
優先度: $PRIORITY
内容: $TASK

このタスクを分析し、適切なエージェントに分配してください。"

tmux send-keys -t "%$P1" "$MESSAGE" Enter

echo ""
echo -e "${G}✅ Task sent to Conductor${NC}"
