# ChatGPT - Miyabi 統合ガイド

ChatGPT UIから自然言語でMiyabiタスクを実行するためのAPI統合ドキュメント

## 概要

| 項目 | 値 |
|------|-----|
| アプリ名 | Miyabi ChatGPT App |
| バージョン | 1.0.0 |
| 場所 | `openai-apps/miyabi-app/` |
| プロトコル | REST API + OpenAI Actions |
| ポート | 3000 (デフォルト) |

## クイックスタート

### 1. インストール

```bash
cd openai-apps/miyabi-app
npm install
```

### 2. 起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build && npm start
```

### 3. 動作確認

```bash
curl http://localhost:3000/api/health
```

---

## API エンドポイント

### POST /api/execute

自然言語プロンプトからタスクを実行

#### リクエスト

```typescript
{
  prompt: string;         // 必須: 自然言語のタスク指示
  context?: {
    projectPath?: string;    // プロジェクトパス
    issueNumber?: number;    // 関連Issue番号
    branchName?: string;     // ブランチ名
    files?: string[];        // 対象ファイル
    previousTaskId?: string; // 前のタスクID
  };
  options?: {
    dryRun?: boolean;        // プレビューのみ
    autoApprove?: boolean;   // 自動承認
    priority?: 'P0-Critical' | 'P1-High' | 'P2-Medium' | 'P3-Low';
    timeout?: number;        // タイムアウト(ms)
    webhookUrl?: string;     // 完了通知URL
  };
}
```

#### レスポンス

```typescript
{
  success: true,
  task: {
    taskId: "task_abc123",
    status: "in_progress",
    parsedTask: { ... },
    startedAt: "2024-12-06T10:00:00Z"
  },
  agent: {
    selected: "codegen",
    name: "CodeGenAgent",
    confidence: 0.95,
    reasoning: "コード生成タスクと判断"
  }
}
```

#### 使用例

```bash
# Issue処理
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Issue #123を処理して"}'

# コードレビュー
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "src/以下のコードをレビューして", "options": {"dryRun": true}}'

# デプロイ
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "stagingにデプロイして"}'
```

---

### POST /api/parse

プロンプトを解析（実行なし）

#### リクエスト

```typescript
{
  prompt: string;  // 解析対象のプロンプト
}
```

#### レスポンス

```typescript
{
  success: true,
  parsed: {
    action: "run_agent",
    actionDescription: "Miyabi Agentを実行",
    priority: "P2-Medium",
    confidence: 0.92,
    parameters: {
      issueNumber: 123
    }
  },
  agent: {
    selected: "coordinator",
    name: "CoordinatorAgent",
    description: "タスク統括・並行実行制御",
    confidence: 0.92,
    reasoning: "...",
    fallbacks: ["codegen", "issue"]
  }
}
```

---

### GET /api/task/:taskId

タスクのステータスを取得

```bash
curl http://localhost:3000/api/task/task_abc123
```

#### レスポンス

```typescript
{
  success: true,
  task: {
    taskId: "task_abc123",
    status: "completed",
    result: {
      success: true,
      output: "PR #456 created",
      artifacts: [
        { type: "pr", name: "PR #456", value: "https://github.com/..." }
      ],
      metrics: {
        durationMs: 45000,
        filesModified: 3
      }
    },
    startedAt: "2024-12-06T10:00:00Z",
    completedAt: "2024-12-06T10:00:45Z"
  }
}
```

---

### GET /api/task/:taskId/progress

タスクの進捗を取得

```bash
curl http://localhost:3000/api/task/task_abc123/progress
```

#### レスポンス

```typescript
{
  success: true,
  progress: {
    taskId: "task_abc123",
    status: "in_progress",
    progress: 60,
    currentStep: "コード生成中",
    steps: [
      { name: "タスク解析", status: "completed" },
      { name: "Agent選択", status: "completed" },
      { name: "コード生成", status: "in_progress" },
      { name: "テスト実行", status: "pending" },
      { name: "PR作成", status: "pending" }
    ]
  }
}
```

---

### GET /api/tasks

全タスク一覧を取得

```bash
curl http://localhost:3000/api/tasks
```

---

### GET /api/agents

利用可能なAgentを取得

```bash
curl http://localhost:3000/api/agents
```

#### レスポンス

```typescript
{
  success: true,
  agents: [
    { id: "coordinator", name: "CoordinatorAgent", description: "タスク統括・並行実行制御" },
    { id: "codegen", name: "CodeGenAgent", description: "AI駆動コード生成" },
    { id: "review", name: "ReviewAgent", description: "品質評価・80点基準" },
    { id: "issue", name: "IssueAgent", description: "Issue分析・Label付与" },
    { id: "pr", name: "PRAgent", description: "PR自動作成" },
    { id: "deployment", name: "DeploymentAgent", description: "CI/CD・自動デプロイ" }
  ]
}
```

---

### GET /api/openai-actions

OpenAI Actions スキーマを取得（ChatGPT統合用）

```bash
curl http://localhost:3000/api/openai-actions
```

---

### GET /api/health

ヘルスチェック

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"2024-12-06T10:00:00Z","version":"1.0.0"}
```

---

## 対応アクション (10種類)

| アクション | 説明 | キーワード例 |
|-----------|------|-------------|
| `create_issue` | Issue作成 | 「Issueを作成」「バグ報告」 |
| `run_agent` | Agent実行 | 「Issue #123を処理」「Agent実行」 |
| `deploy` | デプロイ | 「デプロイ」「staging」「production」 |
| `review_code` | コードレビュー | 「レビュー」「品質チェック」 |
| `generate_code` | コード生成 | 「実装」「コード生成」「機能追加」 |
| `create_pr` | PR作成 | 「PR作成」「プルリクエスト」 |
| `check_status` | ステータス確認 | 「ステータス」「状態確認」 |
| `run_tests` | テスト実行 | 「テスト」「test」 |
| `security_scan` | セキュリティスキャン | 「セキュリティ」「脆弱性」 |
| `generate_docs` | ドキュメント生成 | 「ドキュメント」「README」 |

---

## Agent選択ロジック

自然言語からアクションを解析し、最適なAgentを自動選択:

```
プロンプト解析 → アクション特定 → Agent選択 → 実行
```

### Agent対応表

| アクション | 選択Agent | 信頼度 |
|-----------|----------|--------|
| `run_agent` | coordinator | 0.95 |
| `deploy` | deployment | 0.95 |
| `review_code` | review | 0.90 |
| `generate_code` | codegen | 0.90 |
| `create_pr` | pr | 0.90 |
| `create_issue` | issue | 0.85 |
| `run_tests` | review | 0.80 |
| `security_scan` | review | 0.80 |
| `generate_docs` | codegen | 0.75 |

---

## ChatGPT統合

### 1. OpenAI Plugin設定

`/.well-known/ai-plugin.json` にプラグインマニフェストが配信されます。

```json
{
  "schema_version": "v1",
  "name_for_human": "Miyabi Task Executor",
  "name_for_model": "miyabi",
  "description_for_model": "Execute software development tasks using Miyabi autonomous agents",
  "api": {
    "type": "openapi",
    "url": "http://localhost:3000/api/openai-actions"
  }
}
```

### 2. ChatGPT GPTs設定

1. GPTs Builderで新規作成
2. Actions設定で `/api/openai-actions` のURLを登録
3. 認証なし（または必要に応じてAPI Key設定）

### 3. 使用例（ChatGPT内）

```
User: Issue #123を処理して

ChatGPT: [execute_miyabi_task を呼び出し]
→ CoordinatorAgentが Issue #123 を処理中...
→ 完了: PR #456 を作成しました

User: ステータスを確認

ChatGPT: [get_task_status を呼び出し]
→ タスク完了 (45秒)
→ 3ファイル変更、テスト全パス
```

---

## 優先度設定

| 優先度 | 説明 | ユースケース |
|--------|------|-------------|
| `P0-Critical` | 緊急対応 | 本番障害、セキュリティ脆弱性 |
| `P1-High` | 高優先 | 重要機能、ブロッカー |
| `P2-Medium` | 通常 | 標準タスク（デフォルト） |
| `P3-Low` | 低優先 | リファクタ、ドキュメント |

自然言語での優先度指定:
- 「緊急で」「至急」→ P0-Critical
- 「急ぎで」「優先的に」→ P1-High
- 「時間があれば」「後で」→ P3-Low

---

## 環境変数

```bash
# .env
PORT=3000                          # サーバーポート
CORS_ORIGIN=*                      # CORSオリジン
API_BASE_URL=http://localhost:3000 # 公開URL
NODE_ENV=development               # 環境
```

---

## タスクステータス

| ステータス | 説明 |
|-----------|------|
| `pending` | 待機中 |
| `queued` | キュー登録済み |
| `in_progress` | 実行中 |
| `completed` | 完了 |
| `failed` | 失敗 |
| `blocked` | ブロック（承認待ち等） |

---

## 型定義

主要な型は `src/types/index.ts` に定義:

- `TaskExecutionRequest` - 実行リクエスト
- `TaskExecutionResponse` - 実行レスポンス
- `ParsedTask` - 解析済みタスク
- `ProgressUpdate` - 進捗更新
- `AgentSelectionResult` - Agent選択結果
- `OpenAIAction` - OpenAI Actions スキーマ

---

## ディレクトリ構造

```
openai-apps/miyabi-app/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Expressサーバー
│   ├── routes/
│   │   └── api.ts            # APIルート定義
│   ├── services/
│   │   ├── task-parser.ts    # 自然言語→タスク変換
│   │   ├── agent-selector.ts # Agent自動選択
│   │   └── task-executor.ts  # タスク実行
│   └── types/
│       └── index.ts          # 型定義
└── dist/                     # ビルド出力
```

---

## 制限事項

- 同時実行タスク数: 10
- タイムアウト: 5分（デフォルト）
- プロンプト最大長: 10,000文字

---

**作成日**: 2024-12-06
**バージョン**: 1.0.0
**管理**: Miyabi Autonomous System
