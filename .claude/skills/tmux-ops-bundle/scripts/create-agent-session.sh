#!/bin/bash
# create-agent-session.sh
# Usage: ./create-agent-session.sh SESSION_NAME PROJECT_DIR
# Creates a 4-pane tmux session with Claude Code agents

set -e

SESSION=${1:-"miyabi-agents"}
PROJECT_DIR=${2:-$(pwd)}

echo "🚀 Creating agent session: $SESSION"
echo "   Project: $PROJECT_DIR"

# Kill existing session if exists
tmux kill-session -t $SESSION 2>/dev/null || true

# Create new session
tmux new-session -d -s $SESSION -c $PROJECT_DIR -n main

# Create 4-pane layout
tmux split-window -h -t $SESSION:main -c $PROJECT_DIR
tmux split-window -v -t $SESSION:main.0 -c $PROJECT_DIR
tmux split-window -v -t $SESSION:main.2 -c $PROJECT_DIR

# Apply tiled layout
tmux select-layout -t $SESSION:main tiled

# Get pane IDs
PANES=$(tmux list-panes -t $SESSION:main -F "#{pane_id}")
PANE_ARRAY=($PANES)

echo "   Panes created: ${PANE_ARRAY[*]}"

# Start Claude Code in each pane
echo "   Starting Claude Code agents..."
for pane in "${PANE_ARRAY[@]}"; do
    tmux send-keys -t $pane "claude --dangerously-skip-permissions" Enter
    sleep 1.5
done

# Wait for Claude to initialize
echo "   Waiting for initialization..."
sleep 3

# Assign roles
echo "   Assigning agent roles..."

# Conductor
tmux send-keys -t "${PANE_ARRAY[0]}" "あなたは「しきるん」Conductor Agentです。タスク統括・分配・進捗集約を担当します。PUSH Protocol準拠で他エージェントからの報告を受信してください。" Enter

sleep 0.5

# CodeGen
tmux send-keys -t "${PANE_ARRAY[1]}" "あなたは「カエデ」CodeGen Agentです。コード実装を担当します。完了時は [カエデ] 完了: {detail} をしきるんに報告してください。" Enter

sleep 0.5

# Review
tmux send-keys -t "${PANE_ARRAY[2]}" "あなたは「サクラ」Review Agentです。コードレビューを担当します。レビュー完了時は [サクラ] レビュー完了: {result} を報告してください。" Enter

sleep 0.5

# Deploy
tmux send-keys -t "${PANE_ARRAY[3]}" "あなたは「ツバキ」Deploy Agentです。Git操作・PR・デプロイを担当します。PR作成時は [ツバキ] PR作成: #{number} を報告してください。" Enter

echo ""
echo "✅ Session created successfully!"
echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│ Agent Layout                                       │"
echo "├────────────────────┬───────────────────────────────┤"
echo "│ ${PANE_ARRAY[0]} しきるん     │ ${PANE_ARRAY[1]} カエデ                │"
echo "│ (Conductor)        │ (CodeGen)                     │"
echo "├────────────────────┼───────────────────────────────┤"
echo "│ ${PANE_ARRAY[2]} サクラ       │ ${PANE_ARRAY[3]} ツバキ                │"
echo "│ (Review)           │ (Deploy)                      │"
echo "└────────────────────┴───────────────────────────────┘"
echo ""
echo "Connect: tmux attach -t $SESSION"
