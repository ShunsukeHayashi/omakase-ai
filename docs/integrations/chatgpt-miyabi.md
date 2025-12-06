# ChatGPT + Miyabi Integration Guide

**Issue:** #1214
**Status:** Phase 1 Complete
**Version:** 1.0.0

---

## Overview

ChatGPT UIからMiyabiにタスクを指示し、自動実行からレビュー、完了報告までを行う統合機能。

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ChatGPT UI    │────▶│  Miyabi App API │────▶│  Miyabi Agents  │
│  (Natural Lang) │     │  (Task Parser)  │     │  (Autonomous)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Architecture

### Components

1. **Miyabi ChatGPT App** (`openai-apps/miyabi-app/`)
   - Express.js API server
   - Natural language task parsing
   - Task execution orchestration
   - Progress tracking

2. **OpenAI Actions Schema**
   - Custom GPT integration
   - API endpoint definitions
   - Authentication configuration

3. **Miyabi Agent Layer**
   - CoordinatorAgent - タスク統括
   - CodeGenAgent - コード生成
   - ReviewAgent - 品質チェック
   - PRAgent - PR作成
   - DeploymentAgent - デプロイ

---

## Quick Start

### 1. Start the Miyabi App Server

```bash
cd openai-apps/miyabi-app
npm install
npm run dev
```

Server starts at `http://localhost:3000`

### 2. Configure ChatGPT Custom GPT

1. Go to ChatGPT → Explore GPTs → Create
2. Add Action with OpenAPI schema from:
   ```
   http://localhost:3000/api/openai-actions
   ```
3. Configure authentication (if needed)

### 3. Use Natural Language Commands

```
"Miyabi、ログイン機能を実装して"
"テストを実行してカバレッジを確認して"
"このバグを修正してPRを作成して"
```

---

## API Reference

### POST /api/execute

タスクを自然言語で実行

**Request:**
```json
{
  "prompt": "ユーザー認証機能を実装して",
  "options": {
    "autoApprove": false,
    "timeout": 300
  }
}
```

**Response:**
```json
{
  "taskId": "task_abc123",
  "status": "running",
  "agent": "CodeGenAgent",
  "createdAt": "2024-12-06T15:00:00Z"
}
```

---

### POST /api/parse

タスクを解析のみ（実行しない）

**Request:**
```json
{
  "prompt": "APIエンドポイントを追加して"
}
```

**Response:**
```json
{
  "intent": "code_generation",
  "agent": "CodeGenAgent",
  "estimatedTime": 120,
  "requiredApprovals": ["code_review", "test_run"]
}
```

---

### GET /api/task/:taskId

タスクの状態を取得

**Response:**
```json
{
  "taskId": "task_abc123",
  "status": "completed",
  "progress": 100,
  "result": {
    "filesCreated": ["src/auth/login.ts"],
    "testsRun": 15,
    "testsPassed": 15,
    "prUrl": "https://github.com/.../pull/123"
  }
}
```

---

### GET /api/task/:taskId/progress

タスクの進捗をリアルタイム取得

**Response:**
```json
{
  "taskId": "task_abc123",
  "progress": 65,
  "currentStep": "Running tests",
  "steps": [
    { "name": "Parse task", "status": "completed" },
    { "name": "Generate code", "status": "completed" },
    { "name": "Run tests", "status": "in_progress" },
    { "name": "Create PR", "status": "pending" }
  ]
}
```

---

### GET /api/agents

利用可能なエージェント一覧

**Response:**
```json
{
  "agents": [
    {
      "name": "CoordinatorAgent",
      "description": "タスク統括・DAGベースのオーケストレーション",
      "capabilities": ["task_decomposition", "parallel_execution"]
    },
    {
      "name": "CodeGenAgent",
      "description": "Claude Sonnet 4によるコード生成",
      "capabilities": ["typescript", "python", "react"]
    }
  ]
}
```

---

### GET /api/health

ヘルスチェック

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "agents": {
    "available": 7,
    "busy": 2
  }
}
```

---

## Task Types

### コード生成
```
"新しいAPIエンドポイントを追加して"
"ログイン機能を実装して"
"Reactコンポーネントを作成して"
```

### バグ修正
```
"このエラーを修正して: [エラーメッセージ]"
"#123のIssueを解決して"
```

### テスト
```
"全テストを実行して"
"カバレッジを80%以上にして"
```

### レビュー
```
"コードレビューをして"
"セキュリティスキャンを実行して"
```

### デプロイ
```
"stagingにデプロイして"
"本番リリースの準備をして"
```

---

## OpenAI Actions Schema

```yaml
openapi: 3.0.0
info:
  title: Miyabi Task Executor
  version: 1.0.0
servers:
  - url: http://localhost:3000
paths:
  /api/execute:
    post:
      operationId: executeTask
      summary: Execute a development task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                prompt:
                  type: string
                  description: Natural language task description
              required:
                - prompt
      responses:
        '200':
          description: Task started
          content:
            application/json:
              schema:
                type: object
                properties:
                  taskId:
                    type: string
                  status:
                    type: string
```

---

## Configuration

### Environment Variables

```bash
# .env
PORT=3000
CORS_ORIGIN=*
API_BASE_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-xxxxx
GITHUB_TOKEN=ghp_xxxxx
```

### Plugin Manifest

Located at `/.well-known/ai-plugin.json`:

```json
{
  "schema_version": "v1",
  "name_for_human": "Miyabi Task Executor",
  "name_for_model": "miyabi",
  "description_for_model": "Execute software development tasks...",
  "auth": { "type": "none" },
  "api": {
    "type": "openapi",
    "url": "http://localhost:3000/api/openai-actions"
  }
}
```

---

## Security Considerations

1. **認証**: 現在は認証なし。本番環境ではOAuth/API Keyを設定
2. **レート制限**: 10 requests/minute/user
3. **タスク制限**: 同時実行タスク数を制限
4. **サンドボックス**: コード実行は隔離環境で実行

---

## Troubleshooting

### タスクがハングする
```bash
# タスク状態を確認
curl http://localhost:3000/api/task/{taskId}

# サーバーログを確認
tail -f logs/miyabi-app.log
```

### エージェントが応答しない
```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# サーバー再起動
npm run restart
```

---

## Related

- [Miyabi Agents](../../.claude/agents/) - エージェント定義
- [Multi-User Sandbox](../specs/multi-user-sandbox-design.md) - サンドボックス設計
- [MCP Servers](../mcp-servers/) - MCP統合

---

*Document generated for Issue #1214 - ChatGPT UI Integration*
