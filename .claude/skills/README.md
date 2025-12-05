# Miyabi Skills - Claude Code スキル設定

omakase-ai プロジェクト用のClaude Codeスキル群。MCP設定と7つのエージェントを統合。

## スキル一覧

| スキル | 用途 | 自動起動トリガー |
|-------|------|----------------|
| **mcp-integration** | MCP統合（7サーバー） | IDE診断、GitHub操作、コンテキスト分析 |
| **miyabi-orchestration** | CoordinatorAgent | タスク分解、DAG構築、並列実行 |
| **codegen-agent** | CodeGenAgent | コード生成、TypeScript実装 |
| **review-agent** | ReviewAgent | 品質スコアリング、セキュリティスキャン |
| **issue-agent** | IssueAgent | Issue分析、65ラベル自動分類 |
| **pr-agent** | PRAgent | Conventional Commits PR作成 |
| **deployment-agent** | DeploymentAgent | Firebase CI/CD、ヘルスチェック |

## ディレクトリ構造

```
.claude/skills/
├── README.md                    # このファイル
├── mcp-integration/
│   └── SKILL.md                # MCP統合スキル
├── miyabi-orchestration/
│   └── SKILL.md                # CoordinatorAgent
├── codegen-agent/
│   └── SKILL.md                # CodeGenAgent
├── review-agent/
│   └── SKILL.md                # ReviewAgent
├── issue-agent/
│   └── SKILL.md                # IssueAgent
├── pr-agent/
│   └── SKILL.md                # PRAgent
└── deployment-agent/
    └── SKILL.md                # DeploymentAgent
```

## MCP統合

`.claude/mcp.json` で定義された7つのMCPサーバーと連携:

| MCP Server | 機能 | ステータス |
|------------|------|----------|
| `ide-integration` | VS Code診断、Jupyter実行 | 有効 |
| `github-enhanced` | 拡張GitHub操作 | 有効 |
| `project-context` | プロジェクト依存関係 | 有効 |
| `filesystem` | ファイルシステムアクセス | 有効 |
| `context-engineering` | AIコンテキスト最適化 | 有効 |
| `miyabi` | Miyabi CLI統合 | 有効 |
| `dev3000` | UI/UXデバッグ | 有効 |

## スキル起動例

### 自動起動（Claude Codeが自動判定）

```
# CoordinatorAgent起動
"Issue #123を複数タスクに分解して並列実行して"

# CodeGenAgent起動
"新しいAPIエンドポイントのコードを生成して"

# ReviewAgent起動
"このコードの品質をレビューして"

# IssueAgent起動
"このIssueを分析してラベルを付けて"

# PRAgent起動
"この変更でPRを作成して"

# DeploymentAgent起動
"Stagingにデプロイして"
```

### MCP直接利用

```
# Miyabi CLI統合
"プロジェクトのステータスを確認" → miyabi__get_status

# コンテキストエンジニアリング
"AIエージェントガイドを検索" → search_guides_with_gemini

# IDE診断
"TypeScriptエラーを一覧表示" → mcp__ide__getDiagnostics
```

## 識学理論65ラベル体系

スキルは識学理論に基づく組織設計原則を実装:

1. **責任の明確化** - 各Agentが特定責任を負う
2. **権限の委譲** - Agentは自律的に判断・実行
3. **階層の設計** - CoordinatorAgent → 専門Agent
4. **結果の評価** - 品質スコア、カバレッジで評価
5. **曖昧性の排除** - DAGで依存関係明示

## Agent階層構造

```
Human Layer (戦略・承認)
    ├── TechLead
    ├── PO
    └── CISO
        ↓ Escalation
Coordinator Layer
    └── CoordinatorAgent (タスク分解・並行実行制御)
        ↓ Assignment
Specialist Layer
    ├── CodeGenAgent (AI駆動コード生成)
    ├── ReviewAgent (品質評価・80点基準)
    ├── IssueAgent (Issue分析・Label付与)
    ├── PRAgent (PR自動作成)
    └── DeploymentAgent (CI/CD・Firebase)
```

## 品質基準

| 項目 | 基準値 | 測定 |
|------|--------|------|
| 品質スコア | ≥80点 | ReviewAgent |
| TypeScriptエラー | 0件 | tsc |
| Critical脆弱性 | 0件 | Security Scan |
| テストカバレッジ | ≥80% | Vitest |

## 関連ファイル

- `.claude/mcp.json` - MCP設定
- `.claude/agents/` - Agent詳細定義
- `.claude/commands/` - スラッシュコマンド
- `CLAUDE.md` - プロジェクトコンテキスト

---

Miyabi - Beauty in Autonomous Development
