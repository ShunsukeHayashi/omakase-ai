# Omakase AI - Claude Code Configuration

## Constitution (Core Principles)

### Article I: Spec-Driven Development
全ての機能は仕様から始まる。コードは仕様の表現であり、仕様がコードを生成する。

### Article II: Test-First Imperative
テストは実装前に書く。テストが失敗することを確認してから実装を開始する。（非交渉）

### Article III: Simplicity
最小限の複雑さで最大の価値を提供する。過度な抽象化を避ける。

### Article IV: Library-First
全ての機能はスタンドアロンライブラリとして始める。

### Article V: Integration-First Testing
モックではなく実際の環境（本物のDB、実際のサービス）でテストする。

---

## Project Context

- **Type**: AI-powered conversational commerce platform
- **Product**: Omakase AI - Voice & Chat agents for websites
- **Mascot**: アヤ (Aya)
- **Parent Repo**: kamui (https://github.com/ShunsukeHayashi/kamui)
- **Reference**: [spec-kit](https://github.com/github/spec-kit) - Spec-Driven Development toolkit

---

## Agent Types

Omakase AIは異なる用途に特化した5つのエージェントタイプを提供:

| Agent | Mode | Status | Purpose |
|-------|------|--------|---------|
| **Shopping Guide Agent** | Voice/Chat | Default | ブランドセーフな挨拶、カタログ連携レコメンド |
| **Product Sales Agent** | Voice/Chat | Active | 商品スペック、在庫、レビュー連携、アップセル |
| **FAQ Support Agent** | Voice/Chat | Active | ナレッジベースからFAQ即答、記事リンク |
| **Onboarding Agent** | Voice | Coming Soon | 音声ガイド付きウェルカムツアー |
| **Robotics Agent** | Vision/Voice | Coming Soon | カメラビジョン＋音声の物理空間コンシェルジュ |

### Widget Configuration

- **Position**: Bottom Left / Bottom Right
- **Style**: Button / Preview / Hidden (自前ボタン)
- **Height**: 可変 (デフォルト 89%)
- **Welcome Notification**: 表示ON/OFF

---

## Knowledge Base & Training

Omakase AIは3つのトレーニングデータソースを持つ:

### 1. Products
商品カタログ管理
- **Fields**: Image, Name, Description, Price, URL, Active
- **Export**: 対応
- **Search**: 商品名検索

### 2. Questions & Answers
FAQ ナレッジベース
- **Fields**: Question, Answer, Status
- **Export**: 対応
- **Search**: Q&A検索

### 3. Documents
ドキュメントアップロード
- **Formats**: PDF, DOCX, TXT, CSV, PPTX, XLSX
- **Max Size**: 100MB
- **Upload**: Drag & Drop対応

### Platform Features

| Feature | Tier |
|---------|------|
| Analytics | All |
| Conversations | All |
| Leads | Principal/Enterprise |
| Custom Rules | All |
| Re-Scraping | All |

---

## Development Commands

```bash
# Development
npm run dev              # 開発サーバー起動
npm run watch            # TypeScript watch mode

# Quality
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix
npm run typecheck        # TypeScript type check
npm run format           # Prettier formatting

# Testing
npm test                 # Run all tests
npm run test:coverage    # Coverage report (target: 80%+)

# Build
npm run build            # Build all
npm run package          # Create release package
```

---

## Code Standards

- **Language**: TypeScript (strict mode)
- **Indent**: 2 spaces
- **Comments**: 日本語 OK
- **Commits**: English with conventional prefixes (feat/fix/refactor/docs/test/chore)
- **Coverage**: 80%+ target

---

## Workflow (Spec-Driven)

1. `/speckit.constitution` - プロジェクト原則を定義
2. `/speckit.specify` - 要件を仕様化（ユーザーストーリー、受け入れ条件）
3. `/speckit.plan` - 技術設計・アーキテクチャ
4. `/speckit.tasks` - タスク分解
5. `/speckit.implement` - 実装
6. `/speckit.validate` - 検証

---

## Directory Structure

```
omakase_ai/
├── .claude/
│   ├── commands/        # Slash commands
│   ├── context/         # Context modules
│   ├── agents/          # Agent specifications
│   └── settings.json    # Claude Code settings
├── src/                 # Source code
├── tests/               # Test files
├── docs/                # Documentation
│   ├── specs/           # Specifications
│   ├── plans/           # Implementation plans
│   └── tasks/           # Task breakdowns
└── CLAUDE.md            # This file
```

---

## Prohibitions

- `.env` ファイルをコミットしない
- `node_modules/` を直接編集しない
- 本番認証情報をファイルに記載しない
- テストなしで機能を追加しない
- 仕様なしで実装を開始しない

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `/specify` | 新しい仕様を作成 |
| `/plan` | 実装計画を作成 |
| `/implement` | タスクを実行 |
| `/test` | テストを実行 |
| `/verify` | 全体検証 |
