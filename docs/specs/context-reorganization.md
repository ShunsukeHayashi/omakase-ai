# Context Reorganization Report

## Issue: #977 Miyabi Reconstruction Context整理

## 現状分析

### 既存ファイル
```
.claude/context/
└── architecture.md (1.3KB) - アーキテクチャコンテキスト
```

### 現状の問題点
1. コンテキストファイルが1つのみで構造化されていない
2. カテゴリ分類がない
3. 他の重要なコンテキスト情報が分散している

---

## 整理提案

### 推奨ディレクトリ構造

```
.claude/context/
├── README.md                    # コンテキスト利用ガイド
├── core/                        # コアコンテキスト
│   ├── architecture.md          # アーキテクチャ原則
│   ├── coding-standards.md      # コーディング規約
│   └── security-guidelines.md   # セキュリティガイドライン
├── agents/                      # Agent関連コンテキスト
│   ├── agent-hierarchy.md       # Agent階層構造
│   ├── escalation-rules.md      # エスカレーションルール
│   └── communication-protocol.md # Agent間通信プロトコル
├── mcp/                         # MCP関連コンテキスト
│   ├── mcp-overview.md          # MCP概要
│   └── tool-usage-patterns.md   # ツール使用パターン
├── development/                 # 開発コンテキスト
│   ├── workflow.md              # 開発ワークフロー
│   ├── testing-strategy.md      # テスト戦略
│   └── deployment.md            # デプロイメント
└── domain/                      # ドメインコンテキスト
    ├── business-rules.md        # ビジネスルール
    └── terminology.md           # 用語集
```

---

## 実施内容

### Phase 1: 既存ファイル整理 ✅
- `architecture.md` を確認
- 重複ファイルなし（1ファイルのみ存在）

### Phase 2: カテゴリ構造作成

| カテゴリ | 目的 | 優先度 |
|---------|------|--------|
| `core/` | 基本原則・規約 | P0 |
| `agents/` | Agent運用情報 | P1 |
| `mcp/` | MCPツール情報 | P1 |
| `development/` | 開発プロセス | P2 |
| `domain/` | ドメイン知識 | P2 |

### Phase 3: コンテンツ移行計画

| 現在の場所 | 移行先 | アクション |
|-----------|--------|-----------|
| `.claude/context/architecture.md` | `.claude/context/core/architecture.md` | 移動 |
| `.claude/README.md` (MCP部分) | `.claude/context/mcp/mcp-overview.md` | 抽出 |
| `AGENTS.md` | `.claude/context/agents/agent-hierarchy.md` | 抽出 |
| `CLAUDE.md` (ルール部分) | `.claude/context/core/coding-standards.md` | 抽出 |

---

## 実装アクション

### 即時実行
```bash
# カテゴリディレクトリ作成
mkdir -p .claude/context/{core,agents,mcp,development,domain}

# 既存ファイル移動
mv .claude/context/architecture.md .claude/context/core/
```

### 今後の作業
1. 各カテゴリのREADME作成
2. 既存ドキュメントからコンテキスト抽出
3. コンテキスト読み込み順序の定義

---

## メトリクス

| 項目 | Before | After |
|------|--------|-------|
| ファイル数 | 1 | 5+ (予定) |
| カテゴリ数 | 0 | 5 |
| 重複 | N/A | 0 |
| 構造化 | ❌ | ✅ |

---

## 結論

現在のコンテキストディレクトリは最小構成（1ファイル）のため、重複削除は不要。
カテゴリ構造の導入により、今後のコンテキスト拡張に対応可能な基盤を整備。

---

**作成日**: 2025-12-06
**担当**: ツバキ (Miyabi Agent)
**Issue**: #977
