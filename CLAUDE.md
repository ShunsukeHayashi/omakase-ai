# omakase-ai - Claude Code Context

## プロジェクト概要

**omakase-ai** - Miyabiフレームワークで構築された自律型開発プロジェクト

識学理論(Shikigaku Theory)とAI Agentsを組み合わせた自律型開発環境。

### リポジトリ情報
```
GitHub: ShunsukeHayashi/omakase-ai
Branch: main
Miyabi: .miyabi.yml
```

---

## クイックスタート

### 状態確認
```
/miyabi-status
```

### Issue作成 → Agent実行
```
/create-issue          # 対話的にIssue作成
/miyabi-agent          # Issue番号指定でAgent実行
```

### 全自動モード
```
/miyabi-auto           # Water Spider全自動運用
```

---

## コントロール階層

```
Human Layer (あなた)
├── 戦略決定 / Issue作成 / 承認 / エスカレーション対応
│
├── スラッシュコマンド
│   /miyabi-status  /create-issue  /miyabi-agent  /deploy
│
└── Agent Layer (自律実行)
    Coordinator → CodeGen → Review → PR → Deployment
```

---

## スラッシュコマンド一覧

| コマンド | 用途 |
|---------|------|
| `/miyabi-status` | プロジェクト状態確認 |
| `/miyabi-init` | 新規Miyabiプロジェクト作成 |
| `/miyabi-agent` | Issue指定でAgent実行 |
| `/miyabi-auto` | Water Spider全自動モード |
| `/miyabi-todos` | TODOコメント自動検出・Issue化 |
| `/create-issue` | Agent実行用Issue対話作成 |
| `/agent-run` | Autonomous Agent実行パイプライン |
| `/test` | プロジェクト全体テスト実行 |
| `/deploy` | Firebase/Cloudデプロイ |
| `/verify` | 環境・コンパイル・テスト全チェック |
| `/security-scan` | セキュリティ脆弱性スキャン |
| `/generate-docs` | コードからドキュメント自動生成 |

---

## Skills（自動起動）

Claude Codeが文脈から自動的に適切なスキルを起動:

| スキル | トリガー例 |
|-------|-----------|
| `mcp-integration` | "VS Codeエラー確認", "GitHub Issue操作" |
| `miyabi-orchestration` | "タスク分解", "並列実行", "DAG" |
| `codegen-agent` | "コード生成", "実装", "新機能" |
| `review-agent` | "レビュー", "品質チェック", "スキャン" |
| `issue-agent` | "Issue分析", "ラベル付け" |
| `pr-agent` | "PR作成", "プルリクエスト" |
| `deployment-agent` | "デプロイ", "staging", "production" |

---

## MCP統合（7サーバー）

`.claude/mcp.json` で定義:

| MCP Server | 機能 |
|------------|------|
| `ide-integration` | VS Code診断、Jupyter実行 |
| `github-enhanced` | 拡張GitHub操作 |
| `project-context` | 依存関係分析 |
| `filesystem` | ファイルシステムアクセス |
| `context-engineering` | AIコンテキスト最適化 |
| `miyabi` | Miyabi CLI統合 |
| `dev3000` | UI/UXデバッグ（83%時間削減） |

---

## 7つの自律エージェント

### Agent階層
```
CoordinatorAgent (統括)
    ├── IssueAgent      - 65ラベル自動分類
    ├── CodeGenAgent    - Claude Sonnet 4コード生成
    ├── ReviewAgent     - 品質スコア（80点合格）
    ├── TestAgent       - カバレッジ80%+
    ├── PRAgent         - Conventional Commits
    └── DeploymentAgent - Firebase CI/CD
```

### 自動パイプライン
```
Issue作成 → IssueAgent(ラベル) → CoordinatorAgent(DAG分解)
    → CodeGenAgent(実装) → ReviewAgent(80点チェック)
    → TestAgent(カバレッジ) → PRAgent(Draft PR)
    → DeploymentAgent(自動デプロイ)
```

---

## 品質基準

| 項目 | 基準 | 測定 |
|------|------|------|
| 品質スコア | ≥80点 | ReviewAgent |
| TypeScriptエラー | 0件 | `npm run typecheck` |
| Critical脆弱性 | 0件 | セキュリティスキャン |
| テストカバレッジ | ≥80% | Vitest |

---

## エスカレーション

Agentが自動判断できない時、Human Layerに相談:

| 宛先 | 内容 |
|------|------|
| TechLead | アーキテクチャ判断、循環依存 |
| PO | ビジネス要件不明確 |
| CISO | セキュリティ問題 |
| CTO | 本番デプロイ承認 |

---

## プロジェクト構造

```
omakase-ai/
├── CLAUDE.md              # このファイル
├── .claude/
│   ├── agents/            # 7 Agent定義
│   ├── commands/          # 12 スラッシュコマンド
│   ├── skills/            # 7 自動起動スキル
│   ├── mcp-servers/       # MCPサーバー実装
│   ├── mcp.json           # MCP設定
│   └── hooks/             # 自動化フック
├── src/                   # ソースコード
├── frontend/              # フロントエンド
└── tests/                 # テストコード
```

---

## 開発ガイドライン

### TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "target": "ES2022"
  }
}
```

### セキュリティ
- 機密情報は環境変数: `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`
- `.env` を `.gitignore` に含める
- Secret検出パターンでスキャン

### テスト
```bash
npm test                    # 全テスト
npm run test:watch          # Watch mode
npm run test:coverage       # カバレッジ
```

---

## 環境変数

```bash
GITHUB_TOKEN=ghp_xxxxx           # GitHub PAT（必須）
ANTHROPIC_API_KEY=sk-ant-xxxxx   # Anthropic API（必須）
```

---

## 識学理論 5原則

1. **責任の明確化** - 各AgentがIssueに対する責任を負う
2. **権限の委譲** - Agentは自律的に判断・実行可能
3. **階層の設計** - CoordinatorAgent → 専門Agent
4. **結果の評価** - 品質スコア、カバレッジで客観評価
5. **曖昧性の排除** - DAGで依存関係明示

---

## よく使うコマンド

```bash
# 状態確認
/miyabi-status

# Issue → Agent実行
/create-issue
/miyabi-agent

# 検証・デプロイ
/verify
/test
/deploy

# 全自動運用
/miyabi-auto
```

---

## 関連ドキュメント

- `.claude/README.md` - Claude Code設定詳細
- `.claude/skills/README.md` - スキル一覧
- `.claude/agents/` - 各Agent詳細定義

---

Miyabi - Beauty in Autonomous Development
