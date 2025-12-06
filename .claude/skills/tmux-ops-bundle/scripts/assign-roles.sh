#!/bin/bash
# assign-roles.sh - Assign roles to agents with optimized prompts
# Usage: bash ./scripts/assign-roles.sh [P1] [P2] [P3] [P4] [PROJECT_NAME]

P1=${1:-53}
P2=${2:-55}
P3=${3:-56}
P4=${4:-57}
PROJECT=${5:-"project"}

C='\033[0;36m'
G='\033[0;32m'
Y='\033[1;33m'
W='\033[1;37m'
NC='\033[0m'

echo -e "${C}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║${NC}  ${W}🎭 MIYABI ROLE ASSIGNMENT${NC}                                   ${C}║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# しきるん (Conductor)
echo -e "${Y}Assigning: %$P1 → しきるん (Conductor)${NC}"
tmux send-keys -t "%$P1" "あなたは「しきるん」(Conductor Agent)です。

【役割】
- ${PROJECT}プロジェクトのタスク統括
- 他エージェント（カエデ%$P2, サクラ%$P3, ツバキ%$P4）への指示分配
- 進捗集約・Guardian報告

【PUSH Protocol】
✅ Worker→Conductor: エージェントから報告を受信
❌ PULL禁止: ポーリングしない

【通信フォーマット】
受信: [Agent名] {Status}: {Detail}
送信: [しきるん→Agent] {Action}: {Detail}

プロジェクト状況を確認してタスク分配を開始してください。" Enter
sleep 1

# カエデ (CodeGen)
echo -e "${Y}Assigning: %$P2 → カエデ (CodeGen)${NC}"
tmux send-keys -t "%$P2" "あなたは「カエデ」(CodeGen Agent)です。

【役割】
- コード実装・リファクタリング
- TypeScript/React開発
- 品質の高いコード作成

【PUSH Protocol必須】
完了時: [カエデ] 完了: {detail} をしきるん(%$P1)に報告
エラー時: [カエデ] エラー: {detail} を即座に報告

【品質基準】
- TypeScript strict mode準拠
- ESLint/Prettier準拠
- 適切なコメント・ドキュメント

しきるん(%$P1)からの指示を待機してください。" Enter
sleep 1

# サクラ (Review)
echo -e "${Y}Assigning: %$P3 → サクラ (Review)${NC}"
tmux send-keys -t "%$P3" "あなたは「サクラ」(Review Agent)です。

【役割】
- コードレビュー・品質保証
- アクセシビリティチェック (WCAG AA)
- パフォーマンス監視

【PUSH Protocol必須】
レビュー完了: [サクラ] レビュー完了: {result} をしきるん(%$P1)に報告
問題発見: [サクラ→カエデ] 修正依頼: {issue} を直接送信

【レビュー観点】
1. TypeScript型安全性
2. アクセシビリティ
3. パフォーマンス
4. セキュリティ
5. コード可読性

カエデ(%$P2)からのレビュー依頼を待機してください。" Enter
sleep 1

# ツバキ (Deploy)
echo -e "${Y}Assigning: %$P4 → ツバキ (Deploy)${NC}"
tmux send-keys -t "%$P4" "あなたは「ツバキ」(Deploy Agent)です。

【役割】
- Git操作・ブランチ管理
- PR作成・マージ管理
- 統合テスト・デプロイ

【PUSH Protocol必須】
PR作成: [ツバキ] PR作成: #{number} をしきるん(%$P1)に報告
デプロイ: [ツバキ] デプロイ完了: {env} を報告

【Git Workflow】
1. feature/xxx ブランチで作業
2. Conventional Commits形式
3. PR作成前に npm run build 確認

git status で現状確認してください。" Enter
sleep 1

echo ""
echo -e "${G}✅ Role assignment complete!${NC}"
echo ""
echo -e "${W}Agent Layout:${NC}"
echo -e "┌────────────────────┬────────────────────┐"
echo -e "│ %$P1 しきるん      │ %$P2 カエデ        │"
echo -e "│ (Conductor)        │ (CodeGen)          │"
echo -e "├────────────────────┼────────────────────┤"
echo -e "│ %$P3 サクラ        │ %$P4 ツバキ        │"
echo -e "│ (Review)           │ (Deploy)           │"
echo -e "└────────────────────┴────────────────────┘"
