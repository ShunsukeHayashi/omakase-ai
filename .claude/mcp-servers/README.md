# Miyabi MCP Servers

Claude Codeの機能を拡張する12個のMCPサーバー

## 概要

| 項目 | 値 |
|------|-----|
| サーバー数 | 12 |
| 設定ファイル | `.claude/mcp.json` |
| プロトコル | MCP (Model Context Protocol) |

---

## サーバー一覧

### コア機能 (4)

| サーバー | ファイル | 説明 |
|---------|---------|------|
| **ide-integration** | `ide-integration.js` | VS Code診断、Jupyter実行統合 |
| **github-enhanced** | `github-enhanced.js` | 拡張GitHub操作、Issue/PR管理 |
| **project-context** | `project-context.js` | 依存関係分析、package.json解析 |
| **miyabi** | `miyabi-integration.js` | Miyabi CLI統合、Agent実行 |

### AI生成 (2)

| サーバー | フォルダ | 説明 |
|---------|---------|------|
| **gemini-image-gen** | `gemini-image-gen/` | Gemini AI画像生成・編集 |
| **gemini-slide-gen** | `gemini-slide-gen/` | AIプレゼンテーション生成 |

### マルチエージェント (2)

| サーバー | フォルダ/ファイル | 説明 |
|---------|---------|------|
| **miyabi-investment-society** | `miyabi-investment-society/` | 9エージェント投資分析 |
| **miyabi-tmux** | `miyabi-tmux/` | tmuxセッション制御・通信 |

### 外部連携 (2)

| サーバー | ファイル | 説明 |
|---------|---------|------|
| **tradingview-webhook** | `tradingview-webhook.js` | TradingViewアラート受信 |
| **context-engineering** | (external) | AIコンテキスト最適化 |

### ユーティリティ (2)

| サーバー | コマンド | 説明 |
|---------|---------|------|
| **filesystem** | `npx @modelcontextprotocol/server-filesystem` | ファイルシステムアクセス |
| **dev3000** | `npx dev3000 --mcp` | UI/UXデバッグツール |

---

## 詳細

### 1. ide-integration
VS CodeおよびJupyter統合

**ツール**:
- `getDiagnostics` - エディタ診断取得
- `executeCode` - Jupyter実行

---

### 2. github-enhanced
拡張GitHub操作

**ツール**:
- Issue作成・更新・ラベル付け
- PR作成・マージ
- Projects V2統合

**環境変数**: `GITHUB_TOKEN`

---

### 3. project-context
プロジェクト依存関係分析

**ツール**:
- `getPackageInfo` - package.json解析
- `getDependencyGraph` - 依存グラフ

---

### 4. miyabi (miyabi-integration)
Miyabi CLI統合

**ツール**:
- `miyabi__init` - プロジェクト作成
- `miyabi__agent_run` - Agent実行
- `miyabi__status` - ステータス確認
- `miyabi__auto` - 全自動モード
- `miyabi__todos` - TODO自動検出

---

### 5. gemini-image-gen
Gemini AI画像生成

**ツール**:
- `generate_image` - 画像生成
- `edit_image` - 画像編集
- `describe_image` - 画像説明

**環境変数**: `GEMINI_API_KEY`, `GEMINI_OUTPUT_DIR`

---

### 6. gemini-slide-gen
AIプレゼンテーション生成

**ツール**:
- `generate_outline` - アウトライン生成
- `generate_slides` - スライド生成
- `export_presentation` - エクスポート

**環境変数**: `GEMINI_API_KEY`, `GEMINI_SLIDE_OUTPUT_DIR`

---

### 7. miyabi-investment-society
マルチエージェント投資分析

**9エージェント**:
- ばしょみるん (市場概況)
- えらぶん (スクリーニング)
- ちゃーとみるん (テクニカル)
- ざいむみるん (ファンダメンタル)
- りすくみるん (リスク)
- さいてきかくん (ポートフォリオ)
- とうしきるん (総合分析)
- にゅーすあつめるん (ニュース)
- バックテストくん (バックテスト)

**ドキュメント**: `docs/mcp-servers/miyabi-investment-society.md`

---

### 8. miyabi-tmux
tmuxセッション制御

**ツール**:
- `tmux_list_sessions` - セッション一覧
- `tmux_send_message` - メッセージ送信
- `tmux_pane_capture` - ペイン内容取得
- `tmux_broadcast` - ブロードキャスト

---

### 9. tradingview-webhook
TradingViewアラート受信

**機能**:
- Webhookエンドポイント
- アラート解析
- Investment Society連携

---

### 10. context-engineering
AIコンテキスト最適化

**ツール**:
- `search_guides_with_gemini` - セマンティック検索
- `analyze_guide` - ガイド分析
- `compare_guides` - ガイド比較

**依存**: 外部APIサーバー (`http://localhost:8888`)

---

### 11. filesystem
ファイルシステムアクセス

**ツール**:
- ファイル読み書き
- ディレクトリ操作
- ファイル検索

---

### 12. dev3000
UI/UXデバッグツール

**機能**:
- サーバーログ統合
- ブラウザログ統合
- ネットワーク監視
- 83%デバッグ時間削減

---

## 設定

### mcp.json 構造

```json
{
  "defaults": {
    "github": {
      "owner": "ShunsukeHayashi",
      "repo": "omakase-ai"
    }
  },
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": { ... },
      "disabled": false,
      "description": "説明"
    }
  }
}
```

### 有効化/無効化

```json
{
  "mcpServers": {
    "example-server": {
      "disabled": true  // 無効化
    }
  }
}
```

---

## ディレクトリ構造

```
.claude/mcp-servers/
├── README.md                     # このファイル
├── ide-integration.js            # VS Code/Jupyter統合
├── github-enhanced.js            # GitHub拡張
├── project-context.js            # 依存関係分析
├── miyabi-integration.js         # Miyabi CLI
├── tradingview-webhook.js        # TradingView連携
├── gemini-image-gen/             # 画像生成
│   ├── index.js
│   └── package.json
├── gemini-slide-gen/             # スライド生成
│   ├── index.js
│   └── package.json
├── miyabi-investment-society/    # 投資分析
│   ├── index.js
│   └── package.json
└── miyabi-tmux/                  # tmux制御
    ├── src/
    └── dist/
```

---

## 新規サーバー追加

1. `mcp-servers/` にファイル/フォルダ作成
2. MCP SDKでサーバー実装
3. `mcp.json` に設定追加
4. Claude Code再起動

### テンプレート

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ツール定義・ハンドラー実装

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

**最終更新**: 2025-12-06
**管理**: Miyabi Autonomous System
