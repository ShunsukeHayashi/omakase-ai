# Message Templates

## 標準報告フォーマット

### 進捗報告
```
[Agent名] 進行中: {タスク内容}
[Agent名] Working: {task description}
```

### 完了報告
```
[Agent名] 完了: {成果物}
[Agent名] Complete: {deliverable}
```

### エラー報告
```
[Agent名] エラー: {エラー内容}
[Agent名] Error: {error details}
```

### 待機通知
```
[Agent名] 待機: {待機理由}
[Agent名] Waiting: {waiting for}
```

---

## エージェント間リレー

### レビュー依頼
```
[カエデ→サクラ] レビュー依頼: {ファイル/PR}
[CodeGen→Review] Review request: {file/PR}
```

### PR作成依頼
```
[サクラ→ツバキ] PR作成依頼: レビュー承認済み
[Review→Deploy] PR request: Review approved
```

### 修正依頼
```
[サクラ→カエデ] 修正依頼: {修正内容}
[Review→CodeGen] Fix request: {fix details}
```

---

## Conductor通知

### タスク分配
```
[しきるん→カエデ] タスク割当: Issue #{number}
[しきるん→サクラ] レビュー割当: PR #{number}
[しきるん→ツバキ] デプロイ依頼: {環境}
```

### 進捗確認
```
[しきるん] 進捗確認: 各エージェント状況を報告してください
```

### ブロードキャスト
```
【全体通知】{内容}
【緊急】{内容}
【完了】{内容}
```

---

## 実装例

### カエデ → Conductor
```bash
tmux send-keys -t %53 '[カエデ] 完了: navigation-sidebar.tsx リファクタリング完了。サクラにレビュー依頼済み。' && sleep 0.5 && tmux send-keys -t %53 Enter
```

### カエデ → サクラ
```bash
tmux send-keys -t %56 '[カエデ→サクラ] レビュー依頼: frontend/src/components/navigation-sidebar.tsx' && sleep 0.5 && tmux send-keys -t %56 Enter
```

### サクラ → Conductor
```bash
tmux send-keys -t %53 '[サクラ] レビュー完了: LGTM。ツバキにPR作成依頼済み。' && sleep 0.5 && tmux send-keys -t %53 Enter
```

### ツバキ → Conductor
```bash
tmux send-keys -t %53 '[ツバキ] PR作成: #245 - UI/UX改善' && sleep 0.5 && tmux send-keys -t %53 Enter
```

### ブロードキャスト
```bash
for pane in %53 %55 %56 %57; do
  tmux send-keys -t $pane '【全体通知】v1.2.0 デプロイ完了' && sleep 0.5 && tmux send-keys -t $pane Enter
done
```
