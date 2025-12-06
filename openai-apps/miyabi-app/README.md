# Miyabi ChatGPT App

ChatGPT UIからMiyabiにタスク指示を送る機能を提供するAPIサーバー。

## 機能

| エンドポイント | 機能 |
|---------------|------|
| `POST /api/execute` | 自然言語からタスク実行 |
| `POST /api/parse` | プロンプト解析（実行なし） |
| `GET /api/task/:id` | タスクステータス取得 |
| `GET /api/task/:id/progress` | 進捗追跡 |
| `GET /api/agents` | Agent一覧 |
| `GET /api/openai-actions` | OpenAI Actions Schema |

## インストール

```bash
cd openai-apps/miyabi-app
npm install
```

## 起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build
npm start
```

## 使用例

### タスク実行
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Issue #123を処理して"}'
```

### プロンプト解析
```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"prompt": "コードレビューを実行"}'
```

## 対応アクション

| アクション | キーワード | Agent |
|-----------|-----------|-------|
| Issue作成 | issue作成, create issue | IssueAgent |
| コード生成 | 実装, generate code | CodeGenAgent |
| レビュー | レビュー, review | ReviewAgent |
| PR作成 | pr作成, pull request | PRAgent |
| デプロイ | デプロイ, deploy | DeploymentAgent |
| テスト | テスト実行, run test | CoordinatorAgent |
| セキュリティ | セキュリティスキャン | ReviewAgent |

## ChatGPT統合

`/.well-known/ai-plugin.json` でOpenAI Plugin manifestを提供。
ChatGPT Actionsとして登録可能。

## 環境変数

```bash
PORT=3000
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=*
NODE_ENV=development
```
