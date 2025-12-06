# Claude Context Directory

Claude Codeが参照するコンテキスト情報を格納するディレクトリ。

## 構造

```
context/
├── README.md           # このファイル
├── core/               # コア原則・規約
│   └── architecture.md # アーキテクチャ原則
├── agents/             # Agent関連
├── mcp/                # MCPツール関連
├── development/        # 開発プロセス
└── domain/             # ドメイン知識
```

## カテゴリ説明

| カテゴリ | 内容 |
|---------|------|
| `core/` | アーキテクチャ、コーディング規約、セキュリティ |
| `agents/` | Agent階層、エスカレーション、通信プロトコル |
| `mcp/` | MCPサーバー、ツール使用パターン |
| `development/` | ワークフロー、テスト、デプロイ |
| `domain/` | ビジネスルール、用語集 |

## 使用方法

Claude Codeは必要に応じてこれらのファイルを自動参照します。
